package com.bookingservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
        name = "host_cancellation_quotes",
        indexes = {
                @Index(name = "idx_host_cancellation_quotes_booking", columnList = "booking_id"),
                @Index(name = "idx_host_cancellation_quotes_host", columnList = "host_id"),
                @Index(name = "idx_host_cancellation_quotes_expires", columnList = "expires_at")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HostCancellationQuote {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "quote_id")
    private UUID quoteId;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "host_id", nullable = false)
    private UUID hostId;

    @Column(name = "listing_id", nullable = false)
    private UUID listingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_code", nullable = false, length = 50)
    private HostCancellationReasonCode reasonCode;

    @Column(name = "guest_refund_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal guestRefundAmount;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "penalty_points", nullable = false)
    private Integer penaltyPoints;

    @Column(name = "listing_active_penalty_count", nullable = false)
    private Integer listingActivePenaltyCount;

    @Column(name = "host_active_penalty_count", nullable = false)
    private Integer hostActivePenaltyCount;

    @Column(name = "will_suspend_listing", nullable = false)
    private Boolean willSuspendListing;

    @Column(name = "listing_suspended_until")
    private LocalDateTime listingSuspendedUntil;

    @Column(name = "will_mark_host_admin_review", nullable = false)
    private Boolean willMarkHostAdminReview;

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
