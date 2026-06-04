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
@Table(name = "transactions", indexes = {
    @Index(name = "idx_transactions_booking", columnList = "booking_id"),
    @Index(name = "idx_transactions_payer", columnList = "payer_id"),
    @Index(name = "idx_transactions_payee", columnList = "payee_id"),
    @Index(name = "idx_transactions_status", columnList = "status"),
    @Index(name = "idx_transactions_gateway", columnList = "gateway_transaction_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID transactionId;

    @Column(nullable = false)
    private UUID bookingId;

    @Column(nullable = false)
    private UUID payerId;

    @Column(nullable = false)
    private UUID payeeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_method_id")
    private PaymentMethod paymentMethod;

    @Column(nullable = false, length = 50)
    private String transactionType; // PAYMENT, REFUND, PAYOUT

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(length = 3, nullable = false)
    private String currency = "VND";

    @Column(nullable = false, length = 50)
    private String status; // PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED

    @Column(length = 255)
    private String gatewayTransactionId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> gatewayResponse;

    @Column(columnDefinition = "TEXT")
    private String failureReason;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, updatable = false)
    private LocalDateTime initiatedAt;

    private LocalDateTime completedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (initiatedAt == null) {
            initiatedAt = now;
        }
        if (createdAt == null) {
            createdAt = now;
        }
    }
}
