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
@Table(name = "refunds", indexes = {
    @Index(name = "idx_refunds_original", columnList = "original_transaction_id"),
    @Index(name = "idx_refunds_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID refundId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_transaction_id", nullable = false)
    private Transaction originalTransaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_transaction_id")
    private Transaction refundTransaction;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal refundAmount;

    @Column(nullable = false, length = 50)
    private String refundType; // FULL, PARTIAL

    @Column(nullable = false, length = 100)
    private String refundReason;

    @Column(columnDefinition = "TEXT")
    private String refundDetails;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private RefundStatus status; // PENDING, PROCESSING, COMPLETED, FAILED

    @Enumerated(EnumType.STRING)
    @Column(name = "business_cause", nullable = false, length = 50)
    private RefundBusinessCause businessCause;

    @Column(name = "business_cause_id", nullable = false)
    private UUID businessCauseId;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    private UUID processedBy;

    @Column(length = 255)
    private String gatewayRefundId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime initiatedAt = LocalDateTime.now();

    private LocalDateTime completedAt;
}
