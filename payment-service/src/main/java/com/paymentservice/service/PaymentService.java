package com.paymentservice.service;

import com.paymentservice.config.StripeConfig;
import com.paymentservice.dto.identity.ClientTokenExchangeParam;
import com.paymentservice.dto.identity.ClientTokenExchangeResponse;
import com.paymentservice.dto.request.BookingStatus;
import com.paymentservice.dto.request.CheckoutRequest;
import com.paymentservice.dto.request.CreateBookingRequest;
import com.paymentservice.dto.request.UpdateBookingStatusRequest;
import com.paymentservice.dto.response.CheckoutResponse;
import com.paymentservice.dto.response.CreateBookingResponse;
import com.paymentservice.entity.Payment;
import com.paymentservice.entity.PaymentStatus;
import com.paymentservice.mapper.BookingMapper;
import com.paymentservice.repository.PaymentRepository;
import com.paymentservice.repository.client.BookingClient;
import com.paymentservice.repository.client.IdentityClient;
import com.paymentservice.repository.client.UserClient;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final StripeConfig stripeConfig;
    private final BookingClient bookingServiceClient;
    private final BookingMapper bookingMapper;
    private final UserClient userClient;
    private final IdentityClient identityClient;
    @Value("${idp.client-id}")
    String clientId;

    @Value("${idp.client-secret}")
    String clientSecret;

    /**
     * Xử lý checkout: tạo Booking + PaymentIntent trong một lần gọi duy nhất.
     *
     *
     * Nếu bước nào lỗi → throw exception → Frontend hiển thị lỗi,
     * KHÔNG để booking ở trạng thái orphan (không có payment).
     *
     * @param request thông tin phòng + user + ngày ở + tiền
     * @return clientSecret để Frontend complete Stripe payment
     */
    public CheckoutResponse checkout(CheckoutRequest request) throws StripeException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        Jwt jwt = (Jwt) authentication.getPrincipal();

        String userId = jwt.getSubject();

        log.info("[USERID] userId{}", userId);
//        String email = jwt.getClaim("email");

        log.info("[CHECKOUT] Start: roomId={}, userId={} {}",
                request.getRoomId(), userId, request.getCurrency());

        // ── BƯỚC 1: Tạo Booking tại Booking Service ──────────────────────────
        // Booking được tạo NGAY LẬP TỨC với status PENDING_PAYMENT.
        // Dù user chưa thanh toán, booking đã tồn tại trong hệ thống.
        // → User thoát ra vẫn thấy booking ở trang "Đơn của tôi".
        UUID bookingId;
        CreateBookingResponse response;
        try {
            CreateBookingRequest bookingRequest = bookingMapper.toCreateBookingRequest(request);
            response = bookingServiceClient.createBooking(bookingRequest);
            bookingId = response.getBookingId();
            log.info("[CHECKOUT] Step 1 OK — bookingId={} created (PENDING_PAYMENT)", bookingId);
        } catch (Exception e) {
            log.error("[CHECKOUT] Step 1 FAILED — cannot create booking: {}", e.getMessage());
            throw new RuntimeException("Không thể tạo đơn đặt phòng: " + e.getMessage(), e);
        }

        var hostStripeAccountId = userClient.getStripeAccountId(response.getHostId()).getData();

        log.info("[CHECKOUT] hostStripeAccountId={}", hostStripeAccountId);

        // ── BƯỚC 2: Tạo Stripe PaymentIntent ─────────────────────────────────
        // PaymentIntent đại diện cho 1 giao dịch thanh toán.
        // QUAN TRỌNG: lưu bookingId vào metadata để webhook biết cần update booking nào.
        long amountInSmallestUnit = response.getTotalAmount();

        double platformFeePercent = 10.0;

// 💰 tính fee
        long platformFeeAmount = (long) (amountInSmallestUnit * platformFeePercent / 100.0);

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInSmallestUnit)
                .setCurrency(request.getCurrency().toLowerCase())
                .setDescription("Booking #" + bookingId)

                // 🔥 CHỈ ĐỊNH HOST NHẬN TIỀN
                .setTransferData(
                        PaymentIntentCreateParams.TransferData.builder()
                                .setDestination(hostStripeAccountId) // ví dụ: acct_123456
                                .build()
                )

                // 💰 platform fee (hoa hồng của bạn)
                .setApplicationFeeAmount(platformFeeAmount)

                // ★ metadata.bookingId là "sợi dây" nối PaymentIntent ↔ Booking
                //   Webhook sẽ đọc field này để update đúng booking
                .putMetadata("bookingId",  bookingId.toString())
                .putMetadata("roomId",     request.getRoomId().toString())
                .putMetadata("userId",     userId)
                .putMetadata("source",     "airbnb-clone")
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build()
                )
                .build();

        PaymentIntent paymentIntent;
        try {
            paymentIntent = PaymentIntent.create(params);
            log.info("[CHECKOUT] Step 2 OK — PaymentIntent={} created for booking={}",
                    paymentIntent.getId(), bookingId);
        } catch (StripeException e) {
            log.error("[CHECKOUT] Step 2 FAILED — Stripe error for booking {}: {}", bookingId, e.getMessage());
            // Booking đã tạo xong ở bước 1; để nguyên PENDING_PAYMENT
            // Scheduler sẽ expire sau 15 phút nếu không có payment
            throw e;
        }

        // ── BƯỚC 3: Lưu Payment record vào DB ────────────────────────────────
        Payment payment = Payment.builder()
                .bookingId(bookingId)
                .stripePaymentIntentId(paymentIntent.getId())
                .clientSecret(paymentIntent.getClientSecret())
                .amount(amountInSmallestUnit)
//                .amountDecimal(response.getTotalAmount())
                .currency(request.getCurrency().toLowerCase())
                .status(PaymentStatus.CREATED)
                .build();

        paymentRepository.save(payment);
        log.info("[CHECKOUT] Step 3 OK — Payment record saved for booking={}", bookingId);

        // ── BƯỚC 4: Trả response ──────────────────────────────────────────────
        // Frontend nhận clientSecret → dùng Stripe.js để collect thẻ và submit
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(15);

        return CheckoutResponse.builder()
                .bookingId(bookingId)
                .paymentIntentId(paymentIntent.getId())
                .clientSecret(paymentIntent.getClientSecret())   // ← Frontend cần cái này
                .publishableKey(stripeConfig.getPublishableKey()) // ← Frontend cần để init Stripe.js
                .totalAmount(response.getTotalAmount())
                .currency(request.getCurrency())
                .expiresAt(expiresAt)
                .message("Booking #" + bookingId + " đã được tạo. Hoàn thành thanh toán trong 15 phút.")
                .build();
    }

    /**
     * Xử lý Stripe webhook event.
     *
     * Được gọi từ PaymentController sau khi đã verify Stripe-Signature.
     *
     * Events được xử lý:
     *  • payment_intent.succeeded      → update booking PAID
     *  • payment_intent.payment_failed → giữ PENDING_PAYMENT (user retry)
     *  • payment_intent.canceled       → update payment CANCELLED
     */
    public void handleWebhookEvent(String eventType,
                                   String paymentIntentId,
                                   UUID   bookingId,
                                   String stripeEventId,
                                   String rawPayload) {

        log.info("[WEBHOOK] Received: type={}, piId={}, bookingId={}, eventId={}",
                eventType, paymentIntentId, bookingId, stripeEventId);

        // ── Idempotency check: tránh xử lý 1 event 2 lần ────────────────────
        // Stripe retry webhook nếu nhận được non-2xx response.
        // Kiểm tra event đã xử lý chưa bằng stripeEventId.
        if (paymentRepository.existsByStripeEventId(stripeEventId)) {
            log.warn("[WEBHOOK] Event {} already processed, skip", stripeEventId);
            return;
        }

        // ── Tìm Payment record tương ứng ─────────────────────────────────────
        Payment payment = paymentRepository.findByStripePaymentIntentId(paymentIntentId)
                .orElseGet(() -> {
                    // Edge case: webhook đến trước response của createPaymentIntent (race condition)
                    log.warn("[WEBHOOK] Payment record not found for piId={}, creating stub", paymentIntentId);
                    return Payment.builder()
                            .bookingId(bookingId)
                            .stripePaymentIntentId(paymentIntentId)
                            .clientSecret("")
                            .amount(0L)
                            .currency("usd")
                            .build();
                });

        // Đánh dấu event đã xử lý (idempotency)
        payment.setStripeEventId(stripeEventId);
        payment.setWebhookPayload(rawPayload);

        // ── Xử lý theo loại event ────────────────────────────────────────────
        switch (eventType) {
            case "payment_intent.succeeded" -> {
                log.info("[WEBHOOK] SUCCEEDED → marking booking {} as PAID", bookingId);
                payment.setStatus(PaymentStatus.SUCCEEDED);
                payment.setSucceededAt(LocalDateTime.now());
                // Gọi Booking Service → PAID
                UpdateBookingStatusRequest request = UpdateBookingStatusRequest.builder()
                                .paymentIntentId(paymentIntentId)
                                .status(BookingStatus.PAID)
                                .build();

                // Exchange client Token
                ClientTokenExchangeResponse token = identityClient.exchangeClientToken(ClientTokenExchangeParam.builder()
                        .grant_type("client_credentials")
                        .client_id(clientId)
                        .client_secret(clientSecret)
                        .scope("openid")
                        .build());

                bookingServiceClient.updateBookingStatus("Bearer " + token.getAccessToken(), bookingId, request);
            }

            case "payment_intent.payment_failed" -> {
                // Booking giữ nguyên PENDING_PAYMENT — user có thể thử lại
                // Scheduler sẽ expire sau 15 phút nếu vẫn không thanh toán
                log.warn("[WEBHOOK] FAILED for booking {} — booking stays PENDING_PAYMENT (user can retry)", bookingId);
                payment.setStatus(PaymentStatus.FAILED);
                payment.setFailureMessage("Card declined or payment failed");
//                bookingServiceClient.notifyPaymentFailed(bookingId, "Payment declined");
                log.warn("Payment failed for booking {}: {} — booking stays PENDING_PAYMENT", bookingId, "Payment declined");
            }

            case "payment_intent.canceled" -> {
                log.info("[WEBHOOK] CANCELED for booking {}", bookingId);
                payment.setStatus(PaymentStatus.CANCELLED);
            }

            default -> log.debug("[WEBHOOK] Unhandled event type: {}", eventType);
        }

        paymentRepository.save(payment);
    }

    /**
     * Chuyển đổi amount sang đơn vị nhỏ nhất của currency.
     *
     * Stripe quy ước:
     *  USD / EUR / ... (2 decimal places): nhân × 100  ($1.00 = 100 cents)
     *  VND / JPY / KRW (0 decimal places): giữ nguyên  (₫100,000 = 100000)
     */
    private long toSmallestUnit(BigDecimal amount, String currency) {
        return switch (currency.toLowerCase()) {
            case "vnd", "jpy", "krw", "bif", "gnf", "mga", "pyg", "rwf", "ugx", "xaf", "xof" ->
                    amount.longValue();
            default ->
                    amount.multiply(BigDecimal.valueOf(100)).longValue();
        };
    }
}
