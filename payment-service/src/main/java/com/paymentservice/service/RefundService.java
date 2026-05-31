package com.paymentservice.service;

import com.paymentservice.dto.request.RefundRequest;
import com.paymentservice.dto.response.RefundResponse;
import com.paymentservice.entity.Payment;
import com.paymentservice.entity.PaymentStatus;
import com.paymentservice.entity.Payout;
import com.paymentservice.entity.Refund;
import com.paymentservice.entity.Transaction;
import com.paymentservice.event.RefundCompletedEvent;
import com.paymentservice.mapper.RefundMapper;
import com.paymentservice.repository.PaymentRepository;
import com.paymentservice.repository.PayoutRepository;
import com.paymentservice.repository.RefundRepository;
import com.paymentservice.repository.TransactionRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.Transfer;
import com.stripe.model.TransferReversal;
import com.stripe.net.RequestOptions;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.TransferReversalCollectionCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefundService {

    private final RefundRepository refundRepository;
    private final TransactionRepository transactionRepository;
    private final PaymentRepository paymentRepository;
    private final PayoutRepository payoutRepository;
    private final TransactionService transactionService;
    private final RefundMapper refundMapper;
    private final PaymentEventPublisher eventPublisher;

    @Transactional
    public RefundResponse processRefund(RefundRequest request) {
        Transaction originalTransaction = transactionRepository.findById(request.getTransactionId())
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
        Payment payment = paymentRepository.findByBookingId(originalTransaction.getBookingId())
                .orElseThrow(() -> new RuntimeException("Payment not found for booking"));

        long refundAmount = request.getRefundAmount().longValue();
        long alreadyRefunded = payment.getRefundedAmount() == null ? 0L : payment.getRefundedAmount();
        if (refundAmount <= 0 || refundAmount + alreadyRefunded > payment.getAmount()) {
            throw new RuntimeException("Invalid refund amount");
        }

        Transaction refundTransaction = transactionRepository.save(Transaction.builder()
                .bookingId(originalTransaction.getBookingId())
                .payerId(originalTransaction.getPayeeId())
                .payeeId(originalTransaction.getPayerId())
                .paymentMethod(originalTransaction.getPaymentMethod())
                .transactionType("REFUND")
                .amount(BigDecimal.valueOf(refundAmount))
                .currency(originalTransaction.getCurrency())
                .status("PROCESSING")
                .description("Refund for transaction: " + request.getTransactionId())
                .initiatedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build());

        Refund refund = refundRepository.save(Refund.builder()
                .originalTransaction(originalTransaction)
                .refundTransaction(refundTransaction)
                .refundAmount(BigDecimal.valueOf(refundAmount))
                .refundType(refundAmount == payment.getAmount() ? "FULL" : "PARTIAL")
                .refundReason(request.getRefundReason())
                .refundDetails(request.getRefundDetails())
                .status("PROCESSING")
                .initiatedAt(LocalDateTime.now())
                .build());

        payment.setStatus(PaymentStatus.REFUND_PENDING);
        paymentRepository.save(payment);

        try {
            handleTransferReversalIfNeeded(originalTransaction.getBookingId(), refundAmount, refund);

            com.stripe.model.Refund stripeRefund = com.stripe.model.Refund.create(
                    RefundCreateParams.builder()
                            .setPaymentIntent(payment.getStripePaymentIntentId())
                            .setAmount(refundAmount)
                            .putMetadata("bookingId", originalTransaction.getBookingId().toString())
                            .putMetadata("refundId", refund.getRefundId().toString())
                            .build(),
                    RequestOptions.builder()
                            .setIdempotencyKey("refund_" + refund.getRefundId())
                            .build());

            refund.setGatewayRefundId(stripeRefund.getId());
            refund.setStatus("COMPLETED");
            refund.setCompletedAt(LocalDateTime.now());
            refundTransaction.setGatewayTransactionId(stripeRefund.getId());
            refundTransaction.setStatus("COMPLETED");
            refundTransaction.setCompletedAt(LocalDateTime.now());

            payment.setRefundedAmount(alreadyRefunded + refundAmount);
            payment.setStatus(payment.getRefundedAmount().equals(payment.getAmount())
                    ? PaymentStatus.REFUNDED
                    : PaymentStatus.PARTIALLY_REFUNDED);

            paymentRepository.save(payment);
            transactionRepository.save(refundTransaction);
            Refund saved = refundRepository.save(refund);

            eventPublisher.refundCompleted(originalTransaction.getBookingId().toString(), new RefundCompletedEvent(
                    saved.getRefundId(),
                    originalTransaction.getBookingId(),
                    payment.getId(),
                    refundAmount,
                    payment.getCurrency(),
                    stripeRefund.getId(),
                    LocalDateTime.now()
            ));

            return refundMapper.toResponse(saved);
        } catch (StripeException ex) {
            refund.setStatus("FAILED");
            refund.setRefundDetails(appendDetail(refund.getRefundDetails(), ex.getMessage()));
            refund.setCompletedAt(LocalDateTime.now());
            refundTransaction.setStatus("FAILED");
            refundTransaction.setFailureReason(ex.getMessage());
            payment.setStatus(PaymentStatus.REFUND_FAILED);
            paymentRepository.save(payment);
            transactionRepository.save(refundTransaction);
            return refundMapper.toResponse(refundRepository.save(refund));
        }
    }

    private void handleTransferReversalIfNeeded(UUID bookingId, long refundAmount, Refund refund) throws StripeException {
        List<Payout> payouts = payoutRepository.findByBookingId(bookingId);
        Payout completedPayout = payouts.stream()
                .filter(payout -> "COMPLETED".equals(payout.getStatus()))
                .findFirst()
                .orElse(null);

        if (completedPayout == null) {
            return;
        }

        Transfer transfer = Transfer.retrieve(completedPayout.getStripeTransferId());
        TransferReversal reversal = transfer.getReversals().create(TransferReversalCollectionCreateParams.builder()
                .setAmount(Math.min(refundAmount, completedPayout.getHostEarnings().longValue()))
                .putMetadata("bookingId", bookingId.toString())
                .putMetadata("refundId", refund.getRefundId().toString())
                .build());
        completedPayout.setStripeTransferReversalId(reversal.getId());
        completedPayout.setStatus("REVERSED");
        payoutRepository.save(completedPayout);
    }

    public void updateRefundStatus(UUID refundId, String newStatus) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new RuntimeException("Refund not found"));

        refund.setStatus(newStatus);
        if ("COMPLETED".equals(newStatus) || "FAILED".equals(newStatus)) {
            refund.setCompletedAt(LocalDateTime.now());
            if (refund.getRefundTransaction() != null) {
                transactionService.updateTransactionStatus(refund.getRefundTransaction().getTransactionId(), newStatus);
            }
        }

        refundRepository.save(refund);
    }

    @Transactional(readOnly = true)
    public RefundResponse getRefund(UUID refundId) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new RuntimeException("Refund not found"));
        return refundMapper.toResponse(refund);
    }

    @Transactional(readOnly = true)
    public List<RefundResponse> getTransactionRefunds(UUID transactionId) {
        return refundRepository.findByOriginalTransactionId(transactionId)
                .stream()
                .map(refundMapper::toResponse)
                .collect(Collectors.toList());
    }

    private String appendDetail(String current, String detail) {
        if (current == null || current.isBlank()) {
            return detail;
        }
        return current + "\n" + detail;
    }
}
