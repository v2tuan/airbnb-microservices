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

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "host_penalties",
        indexes = {
                @Index(name = "idx_host_penalties_booking", columnList = "booking_id"),
                @Index(name = "idx_host_penalties_host_status", columnList = "host_id, status, created_at"),
                @Index(name = "idx_host_penalties_listing_status", columnList = "listing_id, status, created_at")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HostPenalty {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "penalty_id")
    private UUID penaltyId;

    @Column(name = "booking_id", nullable = false, unique = true)
    private UUID bookingId;

    @Column(name = "host_id", nullable = false)
    private UUID hostId;

    @Column(name = "listing_id", nullable = false)
    private UUID listingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_code", nullable = false, length = 50)
    private HostCancellationReasonCode reasonCode;

    @Column(name = "points", nullable = false)
    private Integer points;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private HostPenaltyStatus status = HostPenaltyStatus.ACTIVE;

    @Column(name = "listing_suspension_triggered", nullable = false)
    @Builder.Default
    private Boolean listingSuspensionTriggered = Boolean.FALSE;

    @Column(name = "host_admin_review_triggered", nullable = false)
    @Builder.Default
    private Boolean hostAdminReviewTriggered = Boolean.FALSE;

    @Column(name = "listing_suspended_until")
    private LocalDateTime listingSuspendedUntil;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "waived_at")
    private LocalDateTime waivedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
