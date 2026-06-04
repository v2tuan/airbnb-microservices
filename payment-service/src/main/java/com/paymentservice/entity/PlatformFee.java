package com.paymentservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "platform_fees", indexes = {
    @Index(name = "idx_platform_fees_type", columnList = "fee_type"),
    @Index(name = "idx_platform_fees_effective", columnList = "effective_from, effective_to")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformFee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID feeId;

    @Column(nullable = false, length = 50)
    private String feeType; // SERVICE_FEE, HOST_FEE

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal percentage;

    @Column(precision = 10, scale = 2)
    private BigDecimal fixedAmount;

    @Column(precision = 10, scale = 2)
    private BigDecimal minAmount;

    @Column(precision = 10, scale = 2)
    private BigDecimal maxAmount;

    @Column(length = 3, nullable = false)
    private String currency;

    @Column(nullable = false)
    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    @Column(nullable = false)
    private Boolean isActive;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (fixedAmount == null) {
            fixedAmount = BigDecimal.ZERO;
        }
        if (currency == null) {
            currency = "VND";
        }
        if (isActive == null) {
            isActive = true;
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
