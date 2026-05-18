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
@Table(name = "payments")
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * ID của booking tương ứng (foreign key sang Booking Service)
     * Lưu locally để đối chiếu, không có JPA relationship vì khác service
     */
    @Column(name = "booking_id", nullable = false, unique = true)
    private UUID bookingId;

    /**
     * Stripe PaymentIntent ID - key chính để track payment
     * Format: pi_xxxxxxxxxxxxxxxxxxxx
     */
    @Column(name = "stripe_payment_intent_id", nullable = false, unique = true)
    private String stripePaymentIntentId;

    /**
     * Client Secret từ PaymentIntent - gửi cho Frontend để complete payment
     * KHÔNG bao giờ log hay expose secret key này ra ngoài
     */
    @Column(name = "client_secret", nullable = false)
    private String clientSecret;

    /**
     * Số tiền (đơn vị: cents cho USD, hoặc smallest currency unit)
     * Ví dụ: $100.00 → amount = 10000
     */
    @Column(name = "amount", nullable = false)
    private Long amount;  // Stripe dùng Long (cents)

    /**
     * Số tiền dạng decimal để hiển thị
     */
    @Column(name = "amount_decimal", precision = 12, scale = 2)
    private BigDecimal amountDecimal;

    /**
     * Loại tiền tệ (lowercase): usd, vnd, eur
     */
    @Column(name = "currency", length = 3, nullable = false)
    private String currency;

    /**
     * Trạng thái payment:
     * - CREATED: PaymentIntent đã tạo, chờ user thanh toán
     * - SUCCEEDED: Thanh toán thành công (từ Stripe webhook)
     * - FAILED: Thanh toán thất bại
     * - CANCELLED: Bị hủy
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.CREATED;

    /**
     * Stripe event ID từ webhook (để idempotency - tránh xử lý event 2 lần)
     */
    @Column(name = "stripe_event_id", unique = true)
    private String stripeEventId;

    /**
     * Raw payload từ Stripe webhook (để debug và audit)
     */
    @Column(name = "webhook_payload", columnDefinition = "TEXT")
    private String webhookPayload;

    /**
     * Thông báo lỗi nếu payment thất bại
     */
    @Column(name = "failure_message")
    private String failureMessage;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Thời điểm payment thành công
     */
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
