package com.paymentservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_methods", indexes = {
    @Index(name = "idx_payment_methods_user", columnList = "user_id"),
    @Index(name = "idx_payment_methods_token", columnList = "token")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentMethod {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID paymentMethodId;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 50)
    private String methodType; // CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, E_WALLET

    @Column(nullable = false, length = 50)
    private String provider; // VISA, MASTERCARD, MOMO, VNPAY

    @Column(nullable = false, length = 255)
    private String token;

    @Column(length = 4)
    private String lastFourDigits;

    @Column(length = 50)
    private String cardBrand;

    private Integer expiryMonth;
    private Integer expiryYear;

    @Column(length = 200)
    private String cardholderName;

    @Column(nullable = false)
    private Boolean isDefault = false;

    @Column(nullable = false)
    private Boolean isVerified = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
