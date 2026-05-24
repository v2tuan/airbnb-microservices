package com.paymentservice.service;

import com.paymentservice.config.StripeConfig;
import com.paymentservice.dto.request.BookingStatus;
import com.paymentservice.dto.request.CheckoutRequest;
import com.paymentservice.dto.request.CreateBookingRequest;
import com.paymentservice.dto.request.UpdateBookingStatusRequest;
import com.paymentservice.dto.response.BookingResponse;
import com.paymentservice.dto.response.CheckoutResponse;
import com.paymentservice.dto.response.CreateBookingResponse;
import com.paymentservice.entity.Payment;
import com.paymentservice.entity.PaymentAuditLog;
import com.paymentservice.entity.PaymentStatus;
import com.paymentservice.entity.Payout;
import com.paymentservice.entity.StripeWebhookEvent;
import com.paymentservice.entity.Transaction;
import com.paymentservice.entity.WebhookEventStatus;
import com.paymentservice.event.PaymentSucceededEvent;
import com.paymentservice.mapper.BookingMapper;
import com.paymentservice.repository.PaymentAuditLogRepository;
import com.paymentservice.repository.PaymentRepository;
import com.paymentservice.repository.PayoutRepository;
import com.paymentservice.repository.StripeWebhookEventRepository;
import com.paymentservice.repository.TransactionRepository;
import com.paymentservice.repository.client.BookingClient;
import com.paymentservice.repository.client.UserClient;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.net.RequestOptions;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {
    private static final long PLATFORM_FEE_PERCENT = 10L;

    private final PaymentRepository paymentRepository;
    private final StripeConfig stripeConfig;
    private final BookingClient bookingServiceClient;
    private final BookingMapper bookingMapper;
    private final UserClient userClient;
    private final ServiceTokenProvider serviceTokenProvider;
    private final StripeWebhookEventRepository webhookEventRepository;
    private final TransactionRepository transactionRepository;
    private final PayoutRepository payoutRepository;
    private final PaymentAuditLogRepository auditLogRepository;
    private final PaymentEventPublisher eventPublisher;

    @Transactional
    public CheckoutResponse checkout(CheckoutRequest request, String idempotencyKey) throws StripeException {
        Jwt jwt = currentJwt();
        UUID guestId = UUID.fromString(jwt.getSubject());

        CreateBookingRequest bookingRequest = bookingMapper.toCreateBookingRequest(request);
        CreateBookingResponse booking = bookingServiceClient.createBooking("Bearer " + jwt.getTokenValue(), bookingRequest);
        UUID bookingId = booking.getBookingId();
        UUID hostId = UUID.fromString(booking.getHostId());

        String hostStripeAccountId = userClient.getStripeAccountId(booking.getHostId()).getData();
        if (hostStripeAccountId == null || hostStripeAccountId.isBlank()) {
            throw new IllegalStateException("Host has not completed Stripe Connect onboarding");
        }

        long amount = booking.getTotalAmount();
        long platformFee = amount * PLATFORM_FEE_PERCENT / 100L;
        long hostAmount = amount - platformFee;

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amount)
                .setCurrency(request.getCurrency().toLowerCase())
                .setDescription("Booking #" + bookingId)
                .putMetadata("bookingId", bookingId.toString())
                .putMetadata("guestId", guestId.toString())
                .putMetadata("hostId", hostId.toString())
                .putMetadata("hostStripeAccountId", hostStripeAccountId)
                .putMetadata("platformFeeAmount", String.valueOf(platformFee))
                .putMetadata("hostAmount", String.valueOf(hostAmount))
                .setAutomaticPaymentMethods(PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                        .setEnabled(true)
                        .build())
                .build();

        RequestOptions options = RequestOptions.builder()
                .setIdempotencyKey(resolveStripeIdempotencyKey(idempotencyKey, bookingId))
                .build();
        PaymentIntent paymentIntent = PaymentIntent.create(params, options);

        Payment payment = Payment.builder()
                .bookingId(bookingId)
                .guestId(guestId)
                .hostId(hostId)
                .hostStripeAccountId(hostStripeAccountId)
                .stripePaymentIntentId(paymentIntent.getId())
                .clientSecret(paymentIntent.getClientSecret())
                .amount(amount)
                .platformFeeAmount(platformFee)
                .hostAmount(hostAmount)
                .amountDecimal(BigDecimal.valueOf(amount))
                .currency(request.getCurrency().toLowerCase())
                .status(PaymentStatus.CREATED)
                .build();
        paymentRepository.save(payment);

        audit("PAYMENT_INTENT_CREATED", null, "SUCCESS",
                Map.of("bookingId", bookingId.toString(), "paymentIntentId", paymentIntent.getId()));

        return CheckoutResponse.builder()
                .bookingId(bookingId)
                .paymentIntentId(paymentIntent.getId())
                .clientSecret(paymentIntent.getClientSecret())
                .publishableKey(stripeConfig.getPublishableKey())
                .totalAmount(amount)
                .currency(request.getCurrency())
                .expiresAt(booking.getExpiresAt())
                .message("Booking created. Complete payment before it expires.")
                .build();
    }

    @Transactional
    public void handleWebhookEvent(String eventType,
                                   PaymentIntent paymentIntent,
                                   UUID bookingId,
                                   String stripeEventId,
                                   String rawPayload) {
        if (!registerWebhookEvent(eventType, paymentIntent.getId(), stripeEventId, rawPayload)) {
            return;
        }

        try {
            switch (eventType) {
                case "payment_intent.succeeded" -> handlePaymentSucceeded(paymentIntent, bookingId, stripeEventId, rawPayload);
                case "payment_intent.payment_failed" -> handlePaymentFailed(paymentIntent, stripeEventId, rawPayload);
                case "payment_intent.canceled" -> handlePaymentCancelled(paymentIntent, stripeEventId, rawPayload);
                default -> log.debug("Ignoring Stripe event type={}", eventType);
            }
            markWebhookProcessed(stripeEventId);
        } catch (Exception ex) {
            markWebhookFailed(stripeEventId, ex.getMessage());
            throw ex;
        }
    }

    private void handlePaymentSucceeded(PaymentIntent paymentIntent, UUID bookingId, String eventId, String rawPayload) {
        Payment payment = paymentRepository.findByStripePaymentIntentId(paymentIntent.getId())
                .orElseThrow(() -> new IllegalStateException("Payment not found for PaymentIntent " + paymentIntent.getId()));

        if (payment.getStatus() == PaymentStatus.SUCCEEDED) {
            return;
        }

        payment.setStatus(PaymentStatus.SUCCEEDED);
        payment.setSucceededAt(LocalDateTime.now());
        payment.setStripeEventId(eventId);
        payment.setWebhookPayload(rawPayload);
        paymentRepository.save(payment);

        BookingResponse booking = bookingServiceClient.updateBookingStatus(
                serviceTokenProvider.bearerToken(),
                bookingId,
                UpdateBookingStatusRequest.builder()
                        .paymentIntentId(paymentIntent.getId())
                        .status(BookingStatus.PAID)
                        .build());

        Transaction transaction = transactionRepository.findByGatewayTransactionId(paymentIntent.getId())
                .orElseGet(() -> transactionRepository.save(Transaction.builder()
                        .bookingId(bookingId)
                        .payerId(payment.getGuestId())
                        .payeeId(payment.getHostId())
                        .transactionType("PAYMENT")
                        .amount(BigDecimal.valueOf(payment.getAmount()))
                        .currency(payment.getCurrency())
                        .status("COMPLETED")
                        .gatewayTransactionId(paymentIntent.getId())
                        .description("Payment for booking " + bookingId)
                        .completedAt(LocalDateTime.now())
                        .build()));

        if (payoutRepository.findByBookingId(bookingId).isEmpty()) {
            payoutRepository.save(Payout.builder()
                    .paymentId(payment.getId())
                    .hostId(payment.getHostId())
                    .bookingId(bookingId)
                    .transaction(transaction)
                    .hostStripeAccountId(payment.getHostStripeAccountId())
                    .payoutAmount(BigDecimal.valueOf(payment.getHostAmount()))
                    .platformFee(BigDecimal.valueOf(payment.getPlatformFeeAmount()))
                    .hostEarnings(BigDecimal.valueOf(payment.getHostAmount()))
                    .currency(payment.getCurrency())
                    .payoutMethod("STRIPE_CONNECT")
                    .status("PENDING_CHECKIN")
                    .scheduledAt(booking.getCheckInDate().atStartOfDay().plusDays(1))
                    .build());
        }

        eventPublisher.paymentSucceeded(bookingId.toString(), new PaymentSucceededEvent(
                payment.getId(),
                bookingId,
                payment.getGuestId(),
                payment.getHostId(),
                paymentIntent.getId(),
                payment.getAmount(),
                payment.getPlatformFeeAmount(),
                payment.getHostAmount(),
                payment.getCurrency(),
                LocalDateTime.now()
        ));
    }

    private void handlePaymentFailed(PaymentIntent paymentIntent, String eventId, String rawPayload) {
        Payment payment = paymentRepository.findByStripePaymentIntentId(paymentIntent.getId())
                .orElseThrow(() -> new IllegalStateException("Payment not found for PaymentIntent " + paymentIntent.getId()));
        payment.setStatus(PaymentStatus.FAILED);
        payment.setStripeEventId(eventId);
        payment.setWebhookPayload(rawPayload);
        payment.setFailureMessage("Stripe payment_intent.payment_failed");
        paymentRepository.save(payment);
    }

    private void handlePaymentCancelled(PaymentIntent paymentIntent, String eventId, String rawPayload) {
        Payment payment = paymentRepository.findByStripePaymentIntentId(paymentIntent.getId())
                .orElseThrow(() -> new IllegalStateException("Payment not found for PaymentIntent " + paymentIntent.getId()));
        payment.setStatus(PaymentStatus.CANCELLED);
        payment.setStripeEventId(eventId);
        payment.setWebhookPayload(rawPayload);
        paymentRepository.save(payment);
    }

    private boolean registerWebhookEvent(String type, String paymentIntentId, String eventId, String payload) {
        if (webhookEventRepository.existsById(eventId)) {
            log.info("Duplicate Stripe webhook event skipped: {}", eventId);
            return false;
        }
        try {
            webhookEventRepository.saveAndFlush(StripeWebhookEvent.builder()
                    .eventId(eventId)
                    .eventType(type)
                    .paymentIntentId(paymentIntentId)
                    .payload(payload)
                    .status(WebhookEventStatus.RECEIVED)
                    .receivedAt(LocalDateTime.now())
                    .build());
            return true;
        } catch (DataIntegrityViolationException ex) {
            log.info("Duplicate Stripe webhook event skipped: {}", eventId);
            return false;
        }
    }

    private void markWebhookProcessed(String eventId) {
        webhookEventRepository.findById(eventId).ifPresent(event -> {
            event.setStatus(WebhookEventStatus.PROCESSED);
            event.setProcessedAt(LocalDateTime.now());
            webhookEventRepository.save(event);
        });
    }

    private void markWebhookFailed(String eventId, String reason) {
        webhookEventRepository.findById(eventId).ifPresent(event -> {
            event.setStatus(WebhookEventStatus.FAILED);
            event.setFailureReason(reason);
            webhookEventRepository.save(event);
        });
    }

    private void audit(String action, Transaction transaction, String status, Map<String, Object> responseData) {
        auditLogRepository.save(PaymentAuditLog.builder()
                .transaction(transaction)
                .action(action)
                .status(status)
                .responseData(responseData)
                .build());
    }

    private String resolveStripeIdempotencyKey(String idempotencyKey, UUID bookingId) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            return "checkout_" + idempotencyKey;
        }
        return "checkout_booking_" + bookingId;
    }

    private Jwt currentJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return (Jwt) authentication.getPrincipal();
    }
}
