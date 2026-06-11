package com.paymentservice.controller;

import com.paymentservice.config.StripeConfig;
import com.paymentservice.dto.request.CheckoutRequest;
import com.paymentservice.dto.response.CheckoutResponse;
import com.paymentservice.exception.BusinessException;
import com.paymentservice.service.PaymentService;
import com.stripe.exception.EventDataObjectDeserializationException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@Slf4j
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;
    private final StripeConfig stripeConfig;

    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> checkout(
            @Valid @RequestBody CheckoutRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) throws StripeException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Jwt jwt = (Jwt) authentication.getPrincipal();

        log.info("[API] POST /checkout roomId={} userId={} currency={}",
                request.getRoomId(), jwt.getSubject(), request.getCurrency());

        CheckoutResponse response = paymentService.checkout(request, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader
    ) {
        log.info("[WEBHOOK] Received Stripe webhook");

        Event event = verifyStripeEvent(payload, sigHeader);
        log.info("[WEBHOOK] Verified type={} id={}", event.getType(), event.getId());

        String eventType = event.getType();
        if (!eventType.startsWith("payment_intent.")) {
            log.debug("[WEBHOOK] Ignoring event type={}", eventType);
            return ResponseEntity.ok("Ignored");
        }

        PaymentIntent paymentIntent = deserializePaymentIntent(event);
        UUID bookingId = readBookingId(paymentIntent);

        paymentService.handleWebhookEvent(
                eventType,
                paymentIntent,
                bookingId,
                event.getId(),
                payload
        );

        return ResponseEntity.ok("OK");
    }

    private Event verifyStripeEvent(String payload, String sigHeader) {
        try {
            return Webhook.constructEvent(payload, sigHeader, stripeConfig.getWebhookSecret());
        } catch (SignatureVerificationException exception) {
            log.warn("[WEBHOOK] Invalid signature: {}", exception.getMessage());
            throw BusinessException.badRequest("Invalid Stripe webhook signature");
        } catch (RuntimeException exception) {
            log.warn("[WEBHOOK] Invalid payload: {}", exception.getMessage());
            throw BusinessException.badRequest("Invalid Stripe webhook payload");
        }
    }

    private PaymentIntent deserializePaymentIntent(Event event) {
        try {
            StripeObject stripeObject = event.getDataObjectDeserializer().deserializeUnsafe();
            if (stripeObject instanceof PaymentIntent paymentIntent) {
                return paymentIntent;
            }
            throw BusinessException.badRequest("Stripe webhook event does not contain a PaymentIntent");
        } catch (EventDataObjectDeserializationException exception) {
            log.warn("[WEBHOOK] PaymentIntent deserialize failed: {}", exception.getMessage());
            throw BusinessException.badRequest("Invalid Stripe webhook payload");
        } catch (RuntimeException exception) {
            if (exception instanceof BusinessException businessException) {
                throw businessException;
            }
            log.warn("[WEBHOOK] PaymentIntent deserialize failed: {}", exception.getMessage());
            throw BusinessException.badRequest("Invalid Stripe webhook payload");
        }
    }

    private UUID readBookingId(PaymentIntent paymentIntent) {
        String bookingId = paymentIntent.getMetadata().get("bookingId");
        if (bookingId == null || bookingId.isBlank()) {
            log.warn("[WEBHOOK] Missing bookingId metadata paymentIntentId={}", paymentIntent.getId());
            throw BusinessException.badRequest("Missing bookingId metadata");
        }

        try {
            return UUID.fromString(bookingId);
        } catch (IllegalArgumentException exception) {
            log.warn("[WEBHOOK] Invalid bookingId metadata bookingId={} paymentIntentId={}",
                    bookingId, paymentIntent.getId());
            throw BusinessException.badRequest("Invalid bookingId metadata");
        }
    }
}
