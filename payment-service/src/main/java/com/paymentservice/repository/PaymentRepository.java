package com.paymentservice.repository;

import com.paymentservice.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    /**
     * Tìm payment theo Stripe PaymentIntent ID
     */
    Optional<Payment> findByStripePaymentIntentId(String stripePaymentIntentId);

    /**
     * Tìm payment theo Booking ID
     */
    Optional<Payment> findByBookingId(UUID bookingId);

    /**
     * Kiểm tra event đã xử lý chưa (idempotency)
     * Tránh xử lý cùng một Stripe event 2 lần
     */
    boolean existsByStripeEventId(String stripeEventId);
}
