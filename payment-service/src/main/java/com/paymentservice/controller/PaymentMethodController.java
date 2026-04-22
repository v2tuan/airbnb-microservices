package com.paymentservice.controller;

import com.paymentservice.dto.request.CreatePaymentMethodRequest;
import com.paymentservice.dto.response.PaymentMethodResponse;
import com.paymentservice.service.PaymentMethodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payment-methods")
@RequiredArgsConstructor
public class PaymentMethodController {

    private final PaymentMethodService paymentMethodService;

    /**
     * Create new payment method
     * POST /api/v1/payment-methods
     */
    @PostMapping
    public ResponseEntity<PaymentMethodResponse> createPaymentMethod(
        @RequestParam UUID userId,
        @Valid @RequestBody CreatePaymentMethodRequest request) {
        PaymentMethodResponse response = paymentMethodService.createPaymentMethod(userId, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Get all payment methods for a user
     * GET /api/v1/payment-methods?userId=xxx
     */
    @GetMapping
    public ResponseEntity<List<PaymentMethodResponse>> getUserPaymentMethods(@RequestParam UUID userId) {
        List<PaymentMethodResponse> methods = paymentMethodService.getUserPaymentMethods(userId);
        return ResponseEntity.ok(methods);
    }

    /**
     * Get payment method by ID
     * GET /api/v1/payment-methods/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<PaymentMethodResponse> getPaymentMethod(@PathVariable UUID id) {
        PaymentMethodResponse response = paymentMethodService.getPaymentMethod(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete payment method
     * DELETE /api/v1/payment-methods/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePaymentMethod(@PathVariable UUID id) {
        paymentMethodService.deletePaymentMethod(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Set payment method as default
     * PUT /api/v1/payment-methods/{id}/set-default
     */
    @PutMapping("/{id}/set-default")
    public ResponseEntity<PaymentMethodResponse> setAsDefault(
        @PathVariable UUID id,
        @RequestParam UUID userId) {
        PaymentMethodResponse response = paymentMethodService.setAsDefault(userId, id);
        return ResponseEntity.ok(response);
    }
}
