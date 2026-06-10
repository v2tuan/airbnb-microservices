package com.paymentservice.controller;

import com.paymentservice.dto.request.BookingRefundRequest;
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
@RequestMapping("/refunds")
@RequiredArgsConstructor
public class RefundController {

    private final RefundService refundService;

    @PostMapping("/booking/{bookingId}")
    public ResponseEntity<RefundResponse> processBookingRefund(
            @PathVariable UUID bookingId,
            @Valid @RequestBody BookingRefundRequest request) {
        RefundResponse response = refundService.processBookingRefund(bookingId, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Get refund by ID
     * GET /payments/refunds/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<RefundResponse> getRefund(@PathVariable UUID id) {
        RefundResponse response = refundService.getRefund(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all refunds for a transaction
     * GET /payments/refunds/transaction/{transactionId}
     */
    @GetMapping("/transaction/{transactionId}")
    public ResponseEntity<List<RefundResponse>> getTransactionRefunds(@PathVariable UUID transactionId) {
        List<RefundResponse> refunds = refundService.getTransactionRefunds(transactionId);
        return ResponseEntity.ok(refunds);
    }
}
