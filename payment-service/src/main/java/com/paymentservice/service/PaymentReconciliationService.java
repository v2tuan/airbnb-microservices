package com.paymentservice.service;

import com.paymentservice.entity.Payment;
import com.paymentservice.entity.PaymentStatus;
import com.paymentservice.repository.PaymentRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentReconciliationService {
    private final PaymentRepository paymentRepository;

    @Transactional
    public void reconcilePaymentIntents() {
        paymentRepository.findAll().forEach(this::reconcilePayment);
    }

    private void reconcilePayment(Payment payment) {
        try {
            PaymentIntent paymentIntent = PaymentIntent.retrieve(payment.getStripePaymentIntentId());
            PaymentStatus stripeStatus = mapStripeStatus(paymentIntent.getStatus());

            if (stripeStatus != null && payment.getStatus() != stripeStatus) {
                log.warn("Payment reconciliation mismatch paymentId={} local={} stripe={}",
                        payment.getId(), payment.getStatus(), stripeStatus);
                payment.setStatus(stripeStatus);
                paymentRepository.save(payment);
            }
        } catch (StripeException ex) {
            log.error("Payment reconciliation failed paymentId={}", payment.getId(), ex);
        }
    }

    private PaymentStatus mapStripeStatus(String status) {
        return switch (status) {
            case "succeeded" -> PaymentStatus.SUCCEEDED;
            case "canceled" -> PaymentStatus.CANCELLED;
            case "requires_payment_method" -> PaymentStatus.FAILED;
            case "requires_confirmation", "requires_action", "processing" -> PaymentStatus.CREATED;
            default -> null;
        };
    }
}
