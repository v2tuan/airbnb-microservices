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
        name = "booking_complaints",
        indexes = {
                @Index(name = "idx_booking_complaints_booking", columnList = "booking_id"),
                @Index(name = "idx_booking_complaints_guest", columnList = "guest_id"),
                @Index(name = "idx_booking_complaints_host", columnList = "host_id"),
                @Index(name = "idx_booking_complaints_status_deadline", columnList = "status, host_response_deadline")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingComplaint {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "complaint_id")
    private UUID complaintId;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "guest_id", nullable = false)
    private UUID guestId;

    @Column(name = "host_id", nullable = false)
    private UUID hostId;

    @Column(name = "listing_id", nullable = false)
    private UUID listingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private ComplaintType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private ComplaintStatus status;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "evidence_urls", columnDefinition = "TEXT")
    private String evidenceUrls;

    @Column(name = "host_response", columnDefinition = "TEXT")
    private String hostResponse;

    @Column(name = "host_responded_at")
    private LocalDateTime hostRespondedAt;

    @Column(name = "host_response_deadline", nullable = false)
    private LocalDateTime hostResponseDeadline;

    @Column(name = "escalated_at")
    private LocalDateTime escalatedAt;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "admin_decision", length = 50)
    private AdminComplaintDecision adminDecision;

    @Column(name = "refund_amount", precision = 12, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
}
