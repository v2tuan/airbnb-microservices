package com.paymentservice.controller;

import com.paymentservice.dto.request.ProcessPaymentRequest;
import com.paymentservice.dto.response.TransactionResponse;
import com.paymentservice.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    /**
     * Process payment
     * POST /payments/transactions
     */
    @PostMapping
    public ResponseEntity<TransactionResponse> processPayment(
        @Valid @RequestBody ProcessPaymentRequest request) {
        TransactionResponse response = transactionService.processPayment(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Get transaction by ID
     * GET /payments/transactions/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponse> getTransaction(@PathVariable UUID id) {
        TransactionResponse response = transactionService.getTransaction(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all transactions for a booking
     * GET /payments/transactions/booking/{bookingId}
     */
    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<List<TransactionResponse>> getBookingTransactions(@PathVariable UUID bookingId) {
        List<TransactionResponse> transactions = transactionService.getBookingTransactions(bookingId);
        return ResponseEntity.ok(transactions);
    }

    /**
     * Get all payment transactions for a user (payer)
     * GET /payments/transactions/user/payments/{userId}
     */
    @GetMapping("/user/payments/{userId}")
    public ResponseEntity<List<TransactionResponse>> getUserPaymentTransactions(@PathVariable UUID userId) {
        List<TransactionResponse> transactions = transactionService.getUserPaymentTransactions(userId);
        return ResponseEntity.ok(transactions);
    }

    /**
     * Get all payout transactions for a user (payee/host)
     * GET /payments/transactions/user/payouts/{userId}
     */
    @GetMapping("/user/payouts/{userId}")
    public ResponseEntity<List<TransactionResponse>> getUserPayoutTransactions(@PathVariable UUID userId) {
        List<TransactionResponse> transactions = transactionService.getUserPayoutTransactions(userId);
        return ResponseEntity.ok(transactions);
    }
}
