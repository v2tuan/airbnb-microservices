package com.paymentservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "payouts", indexes = {
    @Index(name = "idx_payouts_host", columnList = "host_id"),
    @Index(name = "idx_payouts_booking", columnList = "booking_id"),
    @Index(name = "idx_payouts_status", columnList = "status"),
    @Index(name = "idx_payouts_scheduled", columnList = "scheduled_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payout {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID payoutId;

    @Column(nullable = false)
    private UUID hostId;

    @Column(nullable = false)
    private UUID bookingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id")
    private Transaction transaction;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal payoutAmount;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal platformFee;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal hostEarnings;

    @Column(length = 3, nullable = false)
    private String currency = "VND";

    @Column(nullable = false, length = 50)
    private String payoutMethod; // BANK_TRANSFER, PAYPAL

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> payoutDetails;

    @Column(nullable = false, length = 50)
    private String status; // PENDING, SCHEDULED, PROCESSING, COMPLETED, FAILED

    @Column(nullable = false)
    private LocalDateTime scheduledAt;

    private LocalDateTime processedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
