package com.bookingservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "booking_cancellation_quotes",
        indexes = {
                @Index(name = "idx_booking_cancellation_quotes_booking", columnList = "booking_id"),
                @Index(name = "idx_booking_cancellation_quotes_guest", columnList = "guest_id"),
                @Index(name = "idx_booking_cancellation_quotes_expires", columnList = "expires_at")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingCancellationQuote {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "quote_id")
    private UUID quoteId;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "guest_id", nullable = false)
    private UUID guestId;

    @Column(name = "policy_code", nullable = false, length = 30)
    private String policyCode;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "accommodation_refund", nullable = false, precision = 12, scale = 2)
    private BigDecimal accommodationRefund;

    @Column(name = "cleaning_fee_refund", nullable = false, precision = 12, scale = 2)
    private BigDecimal cleaningFeeRefund;

    @Column(name = "service_fee_refund", nullable = false, precision = 12, scale = 2)
    private BigDecimal serviceFeeRefund;

    @Column(name = "taxes_refund", nullable = false, precision = 12, scale = 2)
    private BigDecimal taxesRefund;

    @Column(name = "refund_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "non_refundable_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal nonRefundableAmount;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
