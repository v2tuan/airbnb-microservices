package com.paymentservice.service;

import com.paymentservice.dto.request.ProcessPaymentRequest;
import com.paymentservice.dto.response.TransactionResponse;
import com.paymentservice.entity.PaymentMethod;
import com.paymentservice.entity.Transaction;
import com.paymentservice.exception.BusinessException;
import com.paymentservice.mapper.TransactionMapper;
import com.paymentservice.repository.PaymentMethodRepository;
import com.paymentservice.repository.PaymentAuditLogRepository;
import com.paymentservice.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final PaymentAuditLogRepository auditLogRepository;
    private final TransactionMapper transactionMapper;

    /**
     * Process payment
     */
    public TransactionResponse processPayment(ProcessPaymentRequest request) {
        log.info("Processing payment for booking: {}", request.getBookingId());

        // Validate payment method exists
        PaymentMethod paymentMethod = paymentMethodRepository.findById(request.getPaymentMethodId())
            .orElseThrow(() -> BusinessException.notFound("Payment method not found"));

        // Create transaction
        Transaction transaction = Transaction.builder()
            .bookingId(request.getBookingId())
            .payerId(request.getPayerId())
            .payeeId(request.getPayeeId())
            .paymentMethod(paymentMethod)
            .transactionType("PAYMENT")
            .amount(request.getAmount())
            .currency(request.getCurrency())
            .status("PENDING")
            .description(request.getDescription())
            .initiatedAt(LocalDateTime.now())
            .createdAt(LocalDateTime.now())
            .build();

        Transaction savedTransaction = transactionRepository.save(transaction);
        log.info("Transaction created: {} with status PENDING", savedTransaction.getTransactionId());

        // TODO: Call payment gateway API here
        // For now, simulate successful payment
        updateTransactionStatus(savedTransaction.getTransactionId(), "COMPLETED");

        return transactionMapper.toResponse(savedTransaction);
    }

    /**
     * Update transaction status
     */
    @CacheEvict(cacheNames = {"transaction", "bookingTransactions", "userPaymentTransactions", "userPayoutTransactions"}, allEntries = true)
    public void updateTransactionStatus(UUID transactionId, String newStatus) {
        Transaction transaction = transactionRepository.findById(transactionId)
            .orElseThrow(() -> BusinessException.notFound("Transaction not found"));

        transaction.setStatus(newStatus);
        if ("COMPLETED".equals(newStatus) || "FAILED".equals(newStatus)) {
            transaction.setCompletedAt(LocalDateTime.now());
        }

        transactionRepository.save(transaction);
        log.info("Transaction {} status updated to: {}", transactionId, newStatus);
    }

    /**
     * Get transaction by ID
     */
    @Cacheable(cacheNames = "transaction", key = "#transactionId")
    public TransactionResponse getTransaction(UUID transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
            .orElseThrow(() -> BusinessException.notFound("Transaction not found"));
        return transactionMapper.toResponse(transaction);
    }

    /**
     * Get all transactions for a booking
     */
    @Cacheable(cacheNames = "bookingTransactions", key = "#bookingId")
    public List<TransactionResponse> getBookingTransactions(UUID bookingId) {
        return transactionRepository.findByBookingId(bookingId)
            .stream()
            .map(transactionMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Get all transactions for a user (payer)
     */
    @Cacheable(cacheNames = "userPaymentTransactions", key = "#userId")
    public List<TransactionResponse> getUserPaymentTransactions(UUID userId) {
        return transactionRepository.findByPayerId(userId)
            .stream()
            .map(transactionMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Get all transactions for a user (payee - host)
     */
    @Cacheable(cacheNames = "userPayoutTransactions", key = "#userId")
    public List<TransactionResponse> getUserPayoutTransactions(UUID userId) {
        return transactionRepository.findByPayeeId(userId)
            .stream()
            .map(transactionMapper::toResponse)
            .collect(Collectors.toList());
    }
}
