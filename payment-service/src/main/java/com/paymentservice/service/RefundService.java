package com.paymentservice.service;

import com.paymentservice.dto.request.BookingRefundRequest;
import com.paymentservice.dto.response.RefundResponse;
import com.paymentservice.entity.Payment;
import com.paymentservice.entity.PaymentStatus;
import com.paymentservice.entity.Payout;
import com.paymentservice.entity.PayoutStatus;
import com.paymentservice.entity.Refund;
import com.paymentservice.entity.RefundBusinessCause;
import com.paymentservice.entity.RefundStatus;
import com.paymentservice.entity.Transaction;
import com.paymentservice.event.RefundCompletedEvent;
import com.paymentservice.event.RefundFailedEvent;
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
    private final NotificationEventPublisher notificationEventPublisher;

    @Transactional
    public RefundResponse processBookingRefund(UUID bookingId, BookingRefundRequest request) {
        Transaction originalTransaction = transactionRepository.findByBookingId(bookingId).stream()
                .filter(transaction -> "PAYMENT".equals(transaction.getTransactionType()))
                .filter(transaction -> "COMPLETED".equals(transaction.getStatus()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Completed payment transaction not found for booking"));
        return processRefund(
                originalTransaction,
                request.getRefundAmount(),
                request.getRefundReason(),
                request.getRefundDetails(),
                resolveBusinessCause(request.getBusinessCause()),
                request.getBusinessCauseId()
        );
    }

    private RefundResponse processRefund(
            Transaction originalTransaction,
            BigDecimal requestedRefundAmount,
            String refundReason,
            String refundDetails,
            RefundBusinessCause businessCause,
            UUID businessCauseId
    ) {
        Payment payment = paymentRepository.findByBookingId(originalTransaction.getBookingId())
                .orElseThrow(() -> new RuntimeException("Payment not found for booking"));
        if (refundRepository.existsByBusinessCauseAndBusinessCauseId(businessCause, businessCauseId)) {
            throw new RuntimeException("Refund already exists for business cause");
        }

        long refundAmount = toMinorUnitAmount(requestedRefundAmount);
        long alreadyRefunded = payment.getRefundedAmount();
        long remainingRefundable = payment.getAmount() - alreadyRefunded;
        if (refundAmount <= 0 || refundAmount > remainingRefundable) {
            log.error("refundAmount" + refundAmount + " remainingRefundable" + remainingRefundable);
            throw new RuntimeException("Refund amount exceeds remaining refundable paid amount");
        }

        Transaction refundTransaction = transactionRepository.save(Transaction.builder()
                .bookingId(originalTransaction.getBookingId())
                .payerId(originalTransaction.getPayeeId())
                .payeeId(originalTransaction.getPayerId())
                .paymentMethod(originalTransaction.getPaymentMethod())
                .transactionType("REFUND")
                .amount(BigDecimal.valueOf(refundAmount))
                .currency(originalTransaction.getCurrency())
                .status(RefundStatus.PENDING.name())
                .description("Refund for transaction: " + originalTransaction.getTransactionId())
                .initiatedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build());

        Refund refund = refundRepository.save(Refund.builder()
                .originalTransaction(originalTransaction)
                .refundTransaction(refundTransaction)
                .refundAmount(BigDecimal.valueOf(refundAmount))
                .refundType(refundAmount == payment.getAmount() ? "FULL" : "PARTIAL")
                .refundReason(refundReason)
                .refundDetails(refundDetails)
                .status(RefundStatus.PENDING)
                .businessCause(businessCause)
                .businessCauseId(businessCauseId)
                .initiatedAt(LocalDateTime.now())
                .build());

        payment.setStatus(PaymentStatus.REFUND_PENDING);
        paymentRepository.save(payment);

        try {
            refund.setStatus(RefundStatus.PROCESSING);
            refundTransaction.setStatus(RefundStatus.PROCESSING.name());
            transactionRepository.save(refundTransaction);
            refundRepository.save(refund);

            handleTransferReversalIfNeeded(originalTransaction.getBookingId(), refundAmount, refund);

            com.stripe.model.Refund stripeRefund = com.stripe.model.Refund.create(
                    RefundCreateParams.builder()
                            .setPaymentIntent(payment.getStripePaymentIntentId())
                            .setAmount(refundAmount)
                            .putMetadata("bookingId", originalTransaction.getBookingId().toString())
                            .putMetadata("refundId", refund.getRefundId().toString())
                            .putMetadata("businessCause", businessCause.name())
                            .putMetadata("businessCauseId", businessCauseId.toString())
                            .build(),
                    RequestOptions.builder()
                            .setIdempotencyKey("refund_" + refund.getRefundId())
                            .build());

            refund.setGatewayRefundId(stripeRefund.getId());
            refund.setStatus(RefundStatus.COMPLETED);
            refund.setCompletedAt(LocalDateTime.now());
            refundTransaction.setGatewayTransactionId(stripeRefund.getId());
            refundTransaction.setStatus(RefundStatus.COMPLETED.name());
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
            publishRefundNotification("REFUND_COMPLETED", payment, saved, refundAmount, null);

            return refundMapper.toResponse(saved);
        } catch (StripeException ex) {
            refund.setStatus(RefundStatus.FAILED);
            refund.setRefundDetails(appendDetail(refund.getRefundDetails(), ex.getMessage()));
            refund.setFailureReason(ex.getMessage());
            refund.setCompletedAt(LocalDateTime.now());
            refundTransaction.setStatus(RefundStatus.FAILED.name());
            refundTransaction.setFailureReason(ex.getMessage());
            payment.setStatus(PaymentStatus.REFUND_FAILED);
            paymentRepository.save(payment);
            transactionRepository.save(refundTransaction);
            Refund saved = refundRepository.save(refund);
            eventPublisher.refundFailed(originalTransaction.getBookingId().toString(), new RefundFailedEvent(
                    saved.getRefundId(),
                    originalTransaction.getBookingId(),
                    payment.getId(),
                    refundAmount,
                    payment.getCurrency(),
                    ex.getMessage(),
                    LocalDateTime.now()
            ));
            publishRefundNotification("REFUND_FAILED", payment, saved, refundAmount, ex.getMessage());
            return refundMapper.toResponse(saved);
        }
    }

    private void publishRefundNotification(
            String eventType,
            Payment payment,
            Refund refund,
            long amount,
            String failureReason
    ) {
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("refundId", refund.getRefundId().toString());
        payload.put("bookingId", payment.getBookingId().toString());
        payload.put("paymentId", payment.getId().toString());
        payload.put("amount", amount);
        payload.put("currency", payment.getCurrency());
        payload.put("status", refund.getStatus().name());
        if (failureReason != null && !failureReason.isBlank()) {
            payload.put("failureReason", failureReason);
        }

        notificationEventPublisher.publish(eventType, payment.getGuestId(), "GUEST", payload);
        if ("REFUND_FAILED".equals(eventType)) {
            notificationEventPublisher.publishToRole(eventType, "ADMIN", payload);
        }
    }

    private void handleTransferReversalIfNeeded(UUID bookingId, long refundAmount, Refund refund) throws StripeException {
        List<Payout> payouts = payoutRepository.findByBookingId(bookingId);
        Payout completedPayout = payouts.stream()
                .filter(payout -> payout.getStatus() == PayoutStatus.COMPLETED)
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
        completedPayout.setStatus(PayoutStatus.REVERSED);
        payoutRepository.save(completedPayout);
    }

    public void updateRefundStatus(UUID refundId, String newStatus) {
        Refund refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new RuntimeException("Refund not found"));

        RefundStatus status = RefundStatus.valueOf(newStatus);
        refund.setStatus(status);
        if (status == RefundStatus.COMPLETED || status == RefundStatus.FAILED) {
            refund.setCompletedAt(LocalDateTime.now());
            if (refund.getRefundTransaction() != null) {
                transactionService.updateTransactionStatus(refund.getRefundTransaction().getTransactionId(), status.name());
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

    private RefundBusinessCause resolveBusinessCause(String businessCause) {
        try {
            return RefundBusinessCause.valueOf(businessCause);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unsupported refund business cause: " + businessCause);
        }
    }

    private long toMinorUnitAmount(BigDecimal requestedRefundAmount) {
        try {
            return requestedRefundAmount.longValueExact();
        } catch (ArithmeticException ex) {
            throw new IllegalArgumentException("Refund amount must be an exact minor-unit amount", ex);
        }
    }
}
