package com.paymentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CheckoutResponse {
    /** Booking đã được tạo với PENDING_PAYMENT */
    private UUID bookingId;

    /** Stripe PaymentIntent ID */
    private String paymentIntentId;

    /**
     * Client Secret — Frontend cần để complete payment.
     * Stripe.js dùng key này để xác thực với Stripe server.
     * Format: pi_xxx_secret_xxx
     * KHÔNG log/expose key này ra ngoài.
     */
    private String clientSecret;

    /** Publishable key để Frontend khởi tạo Stripe.js */
    private String publishableKey;

    private long totalAmount;
    private String currency;

    /** Thời điểm booking hết hạn (PENDING_PAYMENT expires after 15 min) */
    private LocalDateTime expiresAt;

    private String message;
}
