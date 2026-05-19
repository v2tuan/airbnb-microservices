package com.paymentservice.controller;

import com.paymentservice.config.StripeConfig;
import com.paymentservice.dto.request.CheckoutRequest;
import com.paymentservice.dto.response.CheckoutResponse;
import com.paymentservice.service.PaymentService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;
import com.stripe.net.Webhook;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;
import java.util.UUID;

@RestController
@Slf4j
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;
    private final StripeConfig stripeConfig;

    // =========================================================
    // CHECKOUT ENDPOINT — Frontend chỉ cần gọi đây 1 lần
    // =========================================================

    /**
     * Shopee-style checkout: 1 request → tạo Booking + PaymentIntent.
     *
     * Frontend gửi thông tin phòng, user, ngày ở, tiền.
     * Backend:
     *   1. Tạo Booking (PENDING_PAYMENT) ở Booking Service
     *   2. Tạo Stripe PaymentIntent
     * Frontend nhận:
     *   - clientSecret → dùng stripe.confirmPayment()
     *   - bookingId    → hiển thị cho user
     *
     * POST /api/payments/checkout
     */
    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@Valid @RequestBody CheckoutRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        Jwt jwt = (Jwt) authentication.getPrincipal();

        String userId = jwt.getSubject();

        log.info("[API] POST /checkout — roomId={}, userId={}, {}",
                request.getRoomId(), userId, request.getCurrency());
        try {
            CheckoutResponse response = paymentService.checkout(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("[API] Checkout failed: {}", e.getMessage(), e);
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Checkout thất bại: " + e.getMessage());
        }
    }

    // =========================================================
    // STRIPE WEBHOOK — Nhận events từ Stripe
    // =========================================================

    /**
     * Webhook endpoint — Stripe POST về đây sau khi payment xong.
     *
     * ⚠️  BẮT BUỘC:
     *  1. Verify Stripe-Signature header trước khi xử lý
     *  2. Trả về 200 OK trong vòng 30 giây (Stripe timeout)
     *  3. Xử lý idempotency (Stripe retry nếu nhận error)
     *
     * Chạy local:
     *   stripe listen --forward-to localhost:8888/api/v1/payments/webhook
     *
     * POST /webhook
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        log.info("[WEBHOOK] Received Stripe webhook");

        // ── VERIFY SIGNATURE ─────────────────────────────────────────────────
        Event event;
        try {
            event = Webhook.constructEvent(
                    payload,
                    sigHeader,
                    stripeConfig.getWebhookSecret()
            );
        } catch (SignatureVerificationException e) {
            log.error("[WEBHOOK] Invalid signature — rejecting: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Invalid signature");

        } catch (Exception e) {
            log.error("[WEBHOOK] Malformed event: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Bad event");
        }

        log.info("[WEBHOOK] Verified: type={}, id={}",
                event.getType(),
                event.getId());

        String eventType = event.getType();

        // ── CHỈ XỬ LÝ payment_intent.* ──────────────────────────────────────
        if (!eventType.startsWith("payment_intent.")) {
            log.debug("[WEBHOOK] Ignoring event: {}", eventType);
            return ResponseEntity.ok("Ignored");
        }

        // ── DESERIALIZE PAYMENT INTENT ──────────────────────────────────────
        StripeObject stripeObject;

        try {
            stripeObject = event.getDataObjectDeserializer()
                    .deserializeUnsafe();

        } catch (Exception e) {
            log.error("[WEBHOOK] Deserialize failed: {}", e.getMessage());
            return ResponseEntity.ok("Deserialize failed");
        }

        PaymentIntent pi = (PaymentIntent) stripeObject;

        // ── ĐỌC BOOKING ID ──────────────────────────────────────────────────
        String bookingIdStr = pi.getMetadata().get("bookingId");

        if (bookingIdStr == null || bookingIdStr.isBlank()) {
            log.error("[WEBHOOK] Missing bookingId in metadata for pi={}",
                    pi.getId());

            return ResponseEntity.ok("Missing bookingId metadata");
        }

        UUID bookingId;

        try {
            bookingId = UUID.fromString(bookingIdStr);

        } catch (IllegalArgumentException e) {
            log.error("[WEBHOOK] Invalid bookingId={} in metadata",
                    bookingIdStr);

            return ResponseEntity.ok("Invalid bookingId");
        }

        // ── HANDLE EVENT ────────────────────────────────────────────────────
        paymentService.handleWebhookEvent(
                eventType,
                pi.getId(),
                bookingId,
                event.getId(),
                payload
        );

        // Stripe cần HTTP 200
        return ResponseEntity.ok("OK");
    }
}
