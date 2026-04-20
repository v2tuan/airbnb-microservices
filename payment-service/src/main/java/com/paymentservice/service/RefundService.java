package com.paymentservice.service;

import com.paymentservice.dto.request.RefundRequest;
import com.paymentservice.dto.response.RefundResponse;
import com.paymentservice.entity.Refund;
import com.paymentservice.entity.Transaction;
import com.paymentservice.mapper.RefundMapper;
import com.paymentservice.repository.RefundRepository;
import com.paymentservice.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class RefundService {

    private final RefundRepository refundRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionService transactionService;
    private final RefundMapper refundMapper;

    /**
     * Process refund
     */
    public RefundResponse processRefund(RefundRequest request) {
        log.info("Processing refund for transaction: {}", request.getTransactionId());

        // Get original transaction
        Transaction originalTransaction = transactionRepository.findById(request.getTransactionId())
            .orElseThrow(() -> new RuntimeException("Transaction not found"));

        // Check if amount is valid
        if (request.getRefundAmount().compareTo(originalTransaction.getAmount()) > 0) {
            throw new RuntimeException("Refund amount cannot exceed original transaction amount");
        }

        // Create refund transaction
        Transaction refundTransaction = Transaction.builder()
            .bookingId(originalTransaction.getBookingId())
            .payerId(originalTransaction.getPayeeId()) // Reversed
            .payeeId(originalTransaction.getPayerId()) // Reversed
            .paymentMethod(originalTransaction.getPaymentMethod())
            .transactionType("REFUND")
            .amount(request.getRefundAmount())
            .currency(originalTransaction.getCurrency())
            .status("PENDING")
            .description("Refund for transaction: " + request.getTransactionId())
            .initiatedAt(LocalDateTime.now())
            .createdAt(LocalDateTime.now())
            .build();

        Transaction savedRefundTx = transactionRepository.save(refundTransaction);

        // Create refund record
        Refund refund = Refund.builder()
            .originalTransaction(originalTransaction)
            .refundTransaction(savedRefundTx)
            .refundAmount(request.getRefundAmount())
            .refundType(request.getRefundType())
            .refundReason(request.getRefundReason())
            .refundDetails(request.getRefundDetails())
            .status("PENDING")
            .initiatedAt(LocalDateTime.now())
            .build();

        Refund savedRefund = refundRepository.save(refund);
        log.info("Refund created: {} for transaction: {}", savedRefund.getRefundId(), originalTransaction.getTransactionId());

        // TODO: Call payment gateway refund API here
        // For now, simulate successful refund
        updateRefundStatus(savedRefund.getRefundId(), "COMPLETED");

        return refundMapper.toResponse(savedRefund);
    }

    /**
     * Update refund status
     */
    public void updateRefundStatus(UUID refundId, String newStatus) {
        Refund refund = refundRepository.findById(refundId)
            .orElseThrow(() -> new RuntimeException("Refund not found"));

        refund.setStatus(newStatus);
        if ("COMPLETED".equals(newStatus) || "FAILED".equals(newStatus)) {
            refund.setCompletedAt(LocalDateTime.now());
            // Update refund transaction status
            if (refund.getRefundTransaction() != null) {
                transactionService.updateTransactionStatus(
                    refund.getRefundTransaction().getTransactionId(),
                    newStatus
                );
            }
        }

        refundRepository.save(refund);
        log.info("Refund {} status updated to: {}", refundId, newStatus);
    }

    /**
     * Get refund by ID
     */
    public RefundResponse getRefund(UUID refundId) {
        Refund refund = refundRepository.findById(refundId)
            .orElseThrow(() -> new RuntimeException("Refund not found"));
        return refundMapper.toResponse(refund);
    }

    /**
     * Get all refunds for a transaction
     */
    public List<RefundResponse> getTransactionRefunds(UUID transactionId) {
        return refundRepository.findByOriginalTransactionId(transactionId)
            .stream()
            .map(refundMapper::toResponse)
            .collect(Collectors.toList());
    }
}
