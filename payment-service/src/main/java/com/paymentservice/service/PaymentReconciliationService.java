package com.paymentservice.service;

import com.paymentservice.dto.request.BookingStatus;
import com.paymentservice.dto.request.UpdateBookingStatusRequest;
import com.paymentservice.dto.response.BookingResponse;
import com.paymentservice.entity.Payment;
import com.paymentservice.entity.PaymentStatus;
import com.paymentservice.repository.PaymentRepository;
import com.paymentservice.repository.client.BookingClient;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentReconciliationService {
    private final PaymentRepository paymentRepository;
    private final BookingClient bookingClient;
    private final ServiceTokenProvider serviceTokenProvider;

    @Transactional
    public void reconcilePaymentIntents() {
        paymentRepository.findAll().forEach(this::reconcilePayment);
    }

    private void reconcilePayment(Payment payment) {
        if (isRefundLifecycleStatus(payment.getStatus())) {
            return;
        }

        try {
            PaymentIntent paymentIntent = PaymentIntent.retrieve(payment.getStripePaymentIntentId());
            PaymentStatus stripeStatus = mapStripeStatus(paymentIntent.getStatus());

            if (stripeStatus != null && payment.getStatus() != stripeStatus) {
                log.warn("Payment reconciliation mismatch paymentId={} local={} stripe={}",
                        payment.getId(), payment.getStatus(), stripeStatus);
                payment.setStatus(stripeStatus);
                if (stripeStatus == PaymentStatus.PAID && payment.getSucceededAt() == null) {
                    payment.setSucceededAt(LocalDateTime.now());
                }
                paymentRepository.save(payment);
            }

            if (stripeStatus == PaymentStatus.PAID) {
                confirmBookingIfPending(payment);
            }
        } catch (StripeException ex) {
            log.error("Payment reconciliation failed paymentId={}", payment.getId(), ex);
        } catch (Exception ex) {
            log.error("Payment reconciliation side-effect failed paymentId={}", payment.getId(), ex);
        }
    }

    private PaymentStatus mapStripeStatus(String status) {
        return switch (status) {
            case "succeeded" -> PaymentStatus.PAID;
            case "canceled" -> PaymentStatus.PAYMENT_CANCELLED;
            case "requires_payment_method" -> PaymentStatus.PAYMENT_FAILED;
            case "requires_confirmation", "requires_action", "processing" -> PaymentStatus.PAYMENT_PENDING;
            default -> null;
        };
    }

    private boolean isRefundLifecycleStatus(PaymentStatus status) {
        return status == PaymentStatus.REFUND_PENDING
                || status == PaymentStatus.PARTIALLY_REFUNDED
                || status == PaymentStatus.REFUNDED
                || status == PaymentStatus.REFUND_FAILED;
    }

    private void confirmBookingIfPending(Payment payment) {
        BookingResponse booking = bookingClient.getBooking(serviceTokenProvider.bearerToken(), payment.getBookingId());
        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            return;
        }
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            log.warn("Skipping booking confirmation during reconciliation bookingId={} status={}",
                    payment.getBookingId(), booking.getStatus());
            return;
        }

        bookingClient.updateBookingStatus(
                serviceTokenProvider.bearerToken(),
                payment.getBookingId(),
                UpdateBookingStatusRequest.builder()
                        .paymentIntentId(payment.getStripePaymentIntentId())
                        .status(BookingStatus.CONFIRMED)
                        .build());
    }
}
