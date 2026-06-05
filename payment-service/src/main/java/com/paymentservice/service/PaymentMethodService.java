package com.paymentservice.service;

import com.paymentservice.dto.request.CreatePaymentMethodRequest;
import com.paymentservice.dto.response.PaymentMethodResponse;
import com.paymentservice.entity.PaymentMethod;
import com.paymentservice.exception.BusinessException;
import com.paymentservice.mapper.PaymentMethodMapper;
import com.paymentservice.repository.PaymentMethodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentMethodService {

    private final PaymentMethodRepository paymentMethodRepository;
    private final PaymentMethodMapper paymentMethodMapper;

    /**
     * Create new payment method
     */
    public PaymentMethodResponse createPaymentMethod(UUID userId, CreatePaymentMethodRequest request) {
        // Check if payment method already exists
        if (paymentMethodRepository.existsByUserIdAndToken(userId, request.getToken())) {
            throw BusinessException.conflict("Payment method already exists for this user");
        }

        // If isDefault is true, unset other default methods
        if (request.getIsDefault()) {
            paymentMethodRepository.findByUserIdAndIsDefaultTrue(userId)
                .forEach(pm -> {
                    pm.setIsDefault(false);
                    paymentMethodRepository.save(pm);
                });
        }

        PaymentMethod paymentMethod = PaymentMethod.builder()
            .userId(userId)
            .methodType(request.getMethodType())
            .provider(request.getProvider())
            .token(request.getToken())
            .lastFourDigits(request.getLastFourDigits())
            .cardBrand(request.getCardBrand())
            .expiryMonth(request.getExpiryMonth())
            .expiryYear(request.getExpiryYear())
            .cardholderName(request.getCardholderName())
            .isDefault(request.getIsDefault())
            .isVerified(false)
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build();

        PaymentMethod saved = paymentMethodRepository.save(paymentMethod);
        return paymentMethodMapper.toResponse(saved);
    }

    /**
     * Get all payment methods for a user
     */
    public List<PaymentMethodResponse> getUserPaymentMethods(UUID userId) {
        return paymentMethodRepository.findByUserId(userId)
            .stream()
            .map(paymentMethodMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Get payment method by ID
     */
    public PaymentMethodResponse getPaymentMethod(UUID paymentMethodId) {
        PaymentMethod paymentMethod = paymentMethodRepository.findById(paymentMethodId)
            .orElseThrow(() -> BusinessException.notFound("Payment method not found"));
        return paymentMethodMapper.toResponse(paymentMethod);
    }

    /**
     * Delete payment method
     */
    public void deletePaymentMethod(UUID paymentMethodId) {
        PaymentMethod paymentMethod = paymentMethodRepository.findById(paymentMethodId)
            .orElseThrow(() -> BusinessException.notFound("Payment method not found"));
        paymentMethodRepository.delete(paymentMethod);
    }

    /**
     * Set as default payment method
     */
    public PaymentMethodResponse setAsDefault(UUID userId, UUID paymentMethodId) {
        // Unset all default methods for this user
        paymentMethodRepository.findByUserIdAndIsDefaultTrue(userId)
            .forEach(pm -> {
                pm.setIsDefault(false);
                paymentMethodRepository.save(pm);
            });

        // Set new default
        PaymentMethod paymentMethod = paymentMethodRepository.findById(paymentMethodId)
            .orElseThrow(() -> BusinessException.notFound("Payment method not found"));

        if (!paymentMethod.getUserId().equals(userId)) {
            throw BusinessException.forbidden("Payment method does not belong to this user");
        }

        paymentMethod.setIsDefault(true);
        paymentMethod.setUpdatedAt(LocalDateTime.now());
        PaymentMethod saved = paymentMethodRepository.save(paymentMethod);
        return paymentMethodMapper.toResponse(saved);
    }
}
