package com.paymentservice.controller;

import com.paymentservice.dto.request.RefundRequest;
import com.paymentservice.dto.response.RefundResponse;
import com.paymentservice.service.RefundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    /**
     * Process refund
     * POST /api/v1/refunds
     */
    @PostMapping
    public ResponseEntity<RefundResponse> processRefund(
        @Valid @RequestBody RefundRequest request) {
        RefundResponse response = refundService.processRefund(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Get refund by ID
     * GET /api/v1/refunds/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<RefundResponse> getRefund(@PathVariable UUID id) {
        RefundResponse response = refundService.getRefund(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all refunds for a transaction
     * GET /api/v1/refunds/transaction/{transactionId}
     */
    @GetMapping("/transaction/{transactionId}")
    public ResponseEntity<List<RefundResponse>> getTransactionRefunds(@PathVariable UUID transactionId) {
        List<RefundResponse> refunds = refundService.getTransactionRefunds(transactionId);
        return ResponseEntity.ok(refunds);
    }
}
