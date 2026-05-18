package com.paymentservice.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
@Data
public class StripeConfig {
    /**
     * Stripe Secret Key - đọc từ biến môi trường STRIPE_SECRET_KEY
     */
    @Value("${stripe.secret-key}")
    private String secretKey;

    /**
     * Webhook Secret - dùng để verify chữ ký từ Stripe webhook
     * Lấy từ: stripe listen --forward-to localhost:8080/webhook
     */
    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    /**
     * Publishable Key - an toàn để gửi cho Frontend
     */
    @Value("${stripe.publishable-key}")
    private String publishableKey;

    /**
     * Set Stripe API key khi Spring context khởi động.
     * @PostConstruct đảm bảo được gọi sau khi bean được inject đầy đủ.
     */
    @PostConstruct
    public void initStripe() {
        Stripe.apiKey = secretKey;
        log.info("Stripe SDK initialized with key: {}****",
                secretKey.substring(0, Math.min(secretKey.length(), 8)));
    }
}
