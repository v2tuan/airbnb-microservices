package com.paymentservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "payments", indexes = {
        @Index(name = "idx_payments_booking", columnList = "booking_id"),
        @Index(name = "idx_payments_pi", columnList = "stripe_payment_intent_id"),
        @Index(name = "idx_payments_status", columnList = "status")
})
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Version
    @Column(nullable = false)
    private Long version;

    @Column(name = "booking_id", nullable = false, unique = true)
    private UUID bookingId;

    @Column(name = "guest_id")
    private UUID guestId;

    @Column(name = "host_id")
    private UUID hostId;

    @Column(name = "host_stripe_account_id")
    private String hostStripeAccountId;

    @Column(name = "stripe_payment_intent_id", nullable = false, unique = true)
    private String stripePaymentIntentId;

    @Column(name = "stripe_charge_id")
    private String stripeChargeId;

    @Column(name = "client_secret", nullable = false)
    private String clientSecret;

    @Column(name = "amount", nullable = false)
    private Long amount;

    @Column(name = "platform_fee_amount", nullable = false)
    @Builder.Default
    private Long platformFeeAmount = 0L;

    @Column(name = "host_amount", nullable = false)
    @Builder.Default
    private Long hostAmount = 0L;

    @Column(name = "refunded_amount", nullable = false)
    @Builder.Default
    private Long refundedAmount = 0L;

    @Column(name = "amount_decimal", precision = 12, scale = 2)
    private BigDecimal amountDecimal;

    @Column(name = "currency", length = 3, nullable = false)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.CREATED;

    @Column(name = "stripe_event_id")
    private String stripeEventId;

    @Column(name = "webhook_payload", columnDefinition = "TEXT")
    private String webhookPayload;

    @Column(name = "failure_message")
    private String failureMessage;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "succeeded_at")
    private LocalDateTime succeededAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
