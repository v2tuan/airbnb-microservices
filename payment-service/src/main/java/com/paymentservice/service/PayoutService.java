package com.paymentservice.service;

import com.paymentservice.dto.request.BookingStatus;
import com.paymentservice.dto.response.BookingResponse;
import com.paymentservice.entity.Payment;
import com.paymentservice.entity.PaymentStatus;
import com.paymentservice.entity.Payout;
import com.paymentservice.entity.PayoutStatus;
import com.paymentservice.event.PayoutCompletedEvent;
import com.paymentservice.repository.PaymentRepository;
import com.paymentservice.repository.PayoutRepository;
import com.paymentservice.repository.client.BookingClient;
import com.stripe.exception.StripeException;
import com.stripe.model.BalanceTransaction;
import com.stripe.model.Charge;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Transfer;
import com.stripe.net.RequestOptions;
import com.stripe.param.ChargeRetrieveParams;
import com.stripe.param.PaymentIntentRetrieveParams;
import com.stripe.param.TransferCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayoutService {
    private final PayoutRepository payoutRepository;
    private final PaymentRepository paymentRepository;
    private final BookingClient bookingClient;
    private final ServiceTokenProvider serviceTokenProvider;
    private final PaymentEventPublisher eventPublisher;

    /**
     * Lấy các payout đã tới thời điểm xử lý và xử lý lần lượt trong một transaction.
     * Repository dùng pessimistic lock để tránh hai scheduler cùng xử lý một payout.
     */
    @Transactional
    public void processDuePayouts() {
        LocalDateTime now = LocalDateTime.now();
//        payoutRepository.findDueForProcessing(now).forEach(payout -> processSinglePayout(payout, now));
        var list = payoutRepository.findDueForProcessing(now);
        list.forEach(payout -> processSinglePayout(payout, now));
    }

    private void processSinglePayout(Payout payout, LocalDateTime now) {
//        // Luôn kiểm tra trạng thái booking mới nhất trước khi chuyển tiền cho host.
//        BookingResponse booking = bookingClient.getBooking(serviceTokenProvider.bearerToken(), payout.getBookingId());
//
//        if (isCancelledStatus(booking.getStatus())) {
//            payout.setStatus(PayoutStatus.CANCELLED);
//            payout.setFailureReason("Booking was cancelled before payout");
//            payoutRepository.save(payout);
//            return;
//        }
//
//        if (!isPaymentEligibleForPayout(payout, now)) {
//            return;
//        }
//
//        // Chỉ payout sau khi khách đã check-in/check-out/completed; nếu chưa thì hẹn kiểm tra lại.
//        if (booking.getStatus() != BookingStatus.CHECKED_IN
//                && booking.getStatus() != BookingStatus.CHECKED_OUT
//                && booking.getStatus() != BookingStatus.COMPLETED) {
//            payout.setStatus(PayoutStatus.PENDING_CHECKIN);
//            payout.setScheduledAt(now.plusMinutes(30));
//            payoutRepository.save(payout);
//            return;
//        }
//
//        LocalDateTime eligibleAt = booking.getCheckedInAt() != null
//                ? booking.getCheckedInAt().plusHours(24)
//                : booking.getCheckInDate().atStartOfDay().plusDays(1);
//
//        if (now.isBefore(eligibleAt)) {
//            // Booking đã hợp lệ nhưng chưa đủ thời gian giữ tiền, dời lịch payout tới mốc eligibleAt.
//            payout.setStatus(PayoutStatus.SCHEDULED);
//            payout.setScheduledAt(eligibleAt);
//            payoutRepository.save(payout);
//            return;
//        }

        try {
            // Đánh dấu PROCESSING trước khi gọi Stripe để trạng thái DB phản ánh payout đang được xử lý.
            payout.setStatus(PayoutStatus.PROCESSING);
            payoutRepository.saveAndFlush(payout);

            // Chuẩn bị kế hoạch transfer dựa trên settlement thực tế của Stripe.
            // Payment có thể thu bằng VND nhưng Stripe account của platform settle sang USD,
            // vì vậy không được lấy payout.getCurrency() để tạo Transfer.
            StripeTransferPlan transferPlan = buildStripeTransferPlan(payout);
            TransferCreateParams params = TransferCreateParams.builder()
                    // Amount này là minor unit của settlement currency, ví dụ USD cents.
                    .setAmount(transferPlan.amount())
                    // Currency phải là currency đang có trong platform balance, ví dụ "usd".
                    .setCurrency(transferPlan.currency())
                    // Connected Account của host nhận tiền payout cho booking này.
                    // Khi demo trên Stripe Dashboard, destination cho biết tiền được chuyển tới host nào.
                    .setDestination(payout.getHostStripeAccountId())
                    // Description hiển thị trên Stripe Dashboard để nhìn vào biết đây là payout host cho booking nào.
                    .setDescription(buildStripeTransferDescription(payout, transferPlan))
                    .putMetadata("purpose", "HOST_BOOKING_PAYOUT")
                    .putMetadata("bookingId", payout.getBookingId().toString())
                    .putMetadata("payoutId", payout.getPayoutId().toString())
                    .putMetadata("hostId", payout.getHostId().toString())
                    .putMetadata("hostStripeAccountId", payout.getHostStripeAccountId())
                    // Giữ lại số tiền/currency gốc để đối soát với booking VND trong DB.
                    .putMetadata("originalAmount", payout.getHostEarnings().toPlainString())
                    .putMetadata("originalCurrency", payout.getCurrency().toLowerCase())
                    .putMetadata("settlementAmount", String.valueOf(transferPlan.amount()))
                    .putMetadata("settlementCurrency", transferPlan.currency())
                    // Chỉ lưu charge gốc để đối soát, không dùng source_transaction cho payout delayed.
                    // Với các charge đã refund/đã dùng làm source, Stripe có thể báo source amount = 0.
                    .putMetadata("sourceChargeId", transferPlan.sourceChargeId())
                    // Balance transaction cho biết Stripe đã settle charge này ra currency nào.
                    .putMetadata("settlementBalanceTransactionId", transferPlan.balanceTransactionId())
                    .build();

            log.info("Creating Stripe transfer payoutId={} originalAmount={} originalCurrency={} transferAmount={} transferCurrency={} destination={} charge={} balanceTransaction={}",
                    payout.getPayoutId(),
                    payout.getHostEarnings(),
                    payout.getCurrency(),
                    transferPlan.amount(),
                    transferPlan.currency(),
                    payout.getHostStripeAccountId(),
                    transferPlan.sourceChargeId(),
                    transferPlan.balanceTransactionId());

            Transfer transfer = Transfer.create(params, RequestOptions.builder()
                    // Đổi sang key version mới vì các payout cũ có thể đã từng gửi request VND với key "payout_<id>".
                    // Stripe không cho dùng lại cùng idempotency key với amount/currency khác.
                    .setIdempotencyKey(transferIdempotencyKey(payout, transferPlan))
                    .build());

            // Stripe transfer thành công: lưu mã transfer, hoàn tất payout và phát event cho các service khác.
            payout.setStripeTransferId(transfer.getId());
            payout.setPayoutDetails(buildCompletedPayoutDetails(payout, transferPlan, transfer.getId()));
            payout.setStatus(PayoutStatus.COMPLETED);
            payout.setProcessedAt(LocalDateTime.now());
            payoutRepository.save(payout);

            eventPublisher.payoutCompleted(payout.getBookingId().toString(), new PayoutCompletedEvent(
                    payout.getPayoutId(),
                    payout.getBookingId(),
                    payout.getHostId(),
                    transfer.getId(),
                    transferPlan.amount(),
                    transferPlan.currency(),
                    LocalDateTime.now()
            ));
        } catch (StripeException ex) {
            scheduleRetry(payout, ex.getMessage());
            log.error(ex.getMessage());
        } catch (RuntimeException ex) {
            failPayout(payout, ex.getMessage());
            log.error("Payout {} failed: {}", payout.getPayoutId(), ex.getMessage(), ex);
        }
    }

    /**
     * Nội dung description hiển thị trên Stripe Dashboard cho Transfer.
     * Mục tiêu là demo/đối soát nhanh: biết transfer này trả tiền host cho booking nào,
     * số tiền booking gốc là gì và Stripe đã chuyển bằng settlement currency nào.
     */
    private String buildStripeTransferDescription(Payout payout, StripeTransferPlan transferPlan) {
        return "Host payout for booking "
                + payout.getBookingId()
//                + " | payout "
//                + payout.getPayoutId()
//                + " | host "
//                + payout.getHostId()
                + " | original "
                + payout.getHostEarnings().toPlainString()
                + " "
                + payout.getCurrency().toUpperCase()
                + " | transfer "
                + transferPlan.amount()
                + " "
                + transferPlan.currency().toUpperCase();
    }

    /**
     * Tạo kế hoạch transfer bằng currency thật đang nằm trong Stripe balance.
     *
     * Luồng xử lý:
     * 1. Lấy Payment gốc từ payout.
     * 2. Lấy Charge của PaymentIntent.
     * 3. Expand balance_transaction để biết gross/fee/net/currency sau khi Stripe settle.
     * 4. Tính số tiền host nhận theo settlement currency, không dùng trực tiếp VND.
     */
    private StripeTransferPlan buildStripeTransferPlan(Payout payout) throws StripeException {
        Payment payment = loadPaymentForPayout(payout);
        Charge charge = retrieveChargeWithBalanceTransaction(payment);
        BalanceTransaction balanceTransaction = charge.getBalanceTransactionObject();
        if (balanceTransaction == null) {
            throw new IllegalStateException("Stripe charge " + charge.getId() + " does not have an expanded balance transaction");
        }

        long transferAmount = calculateHostSettlementAmount(payment, payout, balanceTransaction);
        if (transferAmount <= 0) {
            throw new IllegalStateException("Calculated Stripe transfer amount must be positive");
        }

        return new StripeTransferPlan(
                transferAmount,
                balanceTransaction.getCurrency().toLowerCase(),
                charge.getId(),
                balanceTransaction.getId(),
                balanceTransaction.getAmount(),
                balanceTransaction.getFee(),
                balanceTransaction.getNet(),
                balanceTransaction.getExchangeRate()
        );
    }

    /**
     * Lấy Payment gốc để truy ra PaymentIntent/Charge.
     * Với payout Stripe Connect multi-currency, paymentId là bắt buộc vì payout cần biết charge gốc.
     */
    private Payment loadPaymentForPayout(Payout payout) {
        if (payout.getPaymentId() == null) {
            throw new IllegalStateException("Payment record is required for Stripe Connect multi-currency payout");
        }

        return paymentRepository.findById(payout.getPaymentId())
                .orElseThrow(() -> new IllegalStateException("Payment record not found for payout"));
    }

    /**
     * Lấy Charge kèm balance_transaction từ Stripe.
     *
     * Nếu DB chưa lưu stripeChargeId, hàm sẽ lấy latest_charge từ PaymentIntent rồi lưu lại.
     * Sau đó retrieve Charge với expand("balance_transaction") để có dữ liệu settlement:
     * currency, amount, fee, net và exchangeRate.
     */
    private Charge retrieveChargeWithBalanceTransaction(Payment payment) throws StripeException {
        String chargeId = payment.getStripeChargeId();
        if (chargeId == null || chargeId.isBlank()) {
            PaymentIntent paymentIntent = PaymentIntent.retrieve(
                    payment.getStripePaymentIntentId(),
                    PaymentIntentRetrieveParams.builder()
                            .addExpand("latest_charge")
                            .build(),
                    null);
            chargeId = paymentIntent.getLatestCharge();
            if ((chargeId == null || chargeId.isBlank()) && paymentIntent.getLatestChargeObject() != null) {
                chargeId = paymentIntent.getLatestChargeObject().getId();
            }
            if (chargeId == null || chargeId.isBlank()) {
                throw new IllegalStateException("PaymentIntent " + payment.getStripePaymentIntentId() + " does not have a latest charge");
            }

            payment.setStripeChargeId(chargeId);
            paymentRepository.save(payment);
        }

        return Charge.retrieve(
                chargeId,
                ChargeRetrieveParams.builder()
                        .addExpand("balance_transaction")
                        .build(),
                null);
    }

    /**
     * Tính số tiền transfer cho host theo settlement currency.
     *
     * Ví dụ guest trả VND nhưng Stripe settle charge thành USD:
     * transferAmountUsd = settlementNetUsd * hostEarningsVnd / paidAmountVnd
     *
     * Dùng net thay vì gross để tránh transfer vượt quá số dư thật sau Stripe fee.
     * RoundingMode.DOWN giúp không tạo amount lớn hơn balance khả dụng do làm tròn.
     */
    private long calculateHostSettlementAmount(Payment payment, Payout payout, BalanceTransaction balanceTransaction) {
        long paidAmount = payment.getAmount() == null ? 0L : payment.getAmount();
        if (paidAmount <= 0) {
            throw new IllegalStateException("Payment amount must be positive for payout conversion");
        }

        return BigDecimal.valueOf(balanceTransaction.getNet())
                .multiply(BigDecimal.valueOf(payout.getHostEarnings().longValue()))
                .divide(BigDecimal.valueOf(paidAmount), 0, RoundingMode.DOWN)
                .longValueExact();
    }

    /**
     * Lưu thông tin đối soát payout vào cột JSON payoutDetails.
     * Các field này giúp so sánh booking VND trong DB với transfer USD/EUR/... trên Stripe Dashboard.
     */
    private Map<String, Object> buildCompletedPayoutDetails(Payout payout, StripeTransferPlan transferPlan, String transferId) {
        Map<String, Object> details = payout.getPayoutDetails() == null
                ? new HashMap<>()
                : new HashMap<>(payout.getPayoutDetails());
        details.put("stripeTransferId", transferId);
        details.put("originalAmount", payout.getHostEarnings().longValue());
        details.put("originalCurrency", payout.getCurrency().toLowerCase());
        details.put("settlementTransferAmount", transferPlan.amount());
        details.put("settlementCurrency", transferPlan.currency());
        details.put("sourceChargeId", transferPlan.sourceChargeId());
        details.put("settlementBalanceTransactionId", transferPlan.balanceTransactionId());
        details.put("settlementGrossAmount", transferPlan.settlementGrossAmount());
        details.put("settlementFeeAmount", transferPlan.settlementFeeAmount());
        details.put("settlementNetAmount", transferPlan.settlementNetAmount());
        if (transferPlan.exchangeRate() != null) {
            details.put("exchangeRate", transferPlan.exchangeRate());
        }
        return details;
    }

    /**
     * Đánh dấu FAILED cho lỗi nghiệp vụ không nên retry.
     * Ví dụ: thiếu paymentId, không tìm thấy charge, hoặc tính ra amount không hợp lệ.
     */
    private void failPayout(Payout payout, String reason) {
        payout.setFailureReason(reason);
        payout.setStatus(PayoutStatus.FAILED);
        payout.setProcessedAt(LocalDateTime.now());
        payoutRepository.save(payout);
    }

    /**
     * Idempotency key phải ổn định cho cùng một request transfer, nhưng không được trùng với request cũ.
     * Prefix v3 tách khỏi:
     * - logic cũ từng gửi transfer bằng VND với key "payout_<id>".
     * - logic v2 từng gửi transfer kèm source_transaction.
     */
    private String transferIdempotencyKey(Payout payout, StripeTransferPlan transferPlan) {
        return "payout_transfer_v4_"
                + payout.getPayoutId()
                + "_"
                + transferPlan.currency()
                + "_"
                + transferPlan.amount();
    }

    private void scheduleRetry(Payout payout, String reason) {
        // Lỗi Stripe được retry tối đa 5 lần, backoff tuyến tính và giới hạn tối đa 60 phút.
        int retryCount = payout.getRetryCount() == null ? 0 : payout.getRetryCount();
        retryCount++;
        payout.setRetryCount(retryCount);
        payout.setFailureReason(reason);
        payout.setStatus(retryCount >= 5 ? PayoutStatus.FAILED : PayoutStatus.RETRY);
        payout.setNextRetryAt(LocalDateTime.now().plusMinutes(Math.min(60, retryCount * 10L)));
        payoutRepository.save(payout);
    }

    private boolean isPaymentEligibleForPayout(Payout payout, LocalDateTime now) {
        // Một số payout cũ có thể không gắn paymentId; khi đó chỉ dựa vào booking để xét điều kiện payout.
        if (payout.getPaymentId() == null) {
            return true;
        }

        Payment payment = paymentRepository.findById(payout.getPaymentId()).orElse(null);
        if (payment == null) {
            payout.setStatus(PayoutStatus.FAILED);
            payout.setFailureReason("Payment record not found for payout");
            payoutRepository.save(payout);
            return false;
        }

        if (payment.getStatus() == PaymentStatus.PAID) {
            return true;
        }
        // Payment đã thất bại/huỷ/hoàn tiền thì payout không còn hợp lệ.
        if (payment.getStatus() == PaymentStatus.PAYMENT_FAILED
                || payment.getStatus() == PaymentStatus.PAYMENT_CANCELLED
                || payment.getStatus() == PaymentStatus.REFUNDED) {
            payout.setStatus(PayoutStatus.CANCELLED);
            payout.setFailureReason("Payment is not payable: " + payment.getStatus());
            payoutRepository.save(payout);
            return false;
        }

        // Payment chưa sẵn sàng, giữ payout ở trạng thái chờ và kiểm tra lại sau 30 phút.
        payout.setStatus(PayoutStatus.PENDING_CHECKIN);
        payout.setFailureReason("Payment is not ready for payout: " + payment.getStatus());
        payout.setScheduledAt(now.plusMinutes(30));
        payoutRepository.save(payout);
        return false;
    }

    private boolean isCancelledStatus(BookingStatus status) {
        return status == BookingStatus.CANCELLED_BY_GUEST
                || status == BookingStatus.CANCELLED_BY_HOST
                || status == BookingStatus.CANCELLED_BY_ADMIN;
    }

    /**
     * DTO nội bộ chứa toàn bộ dữ liệu đã tính để tạo Stripe Transfer.
     *
     * amount: số tiền transfer theo settlement currency.
     * currency: currency thực sự trong Stripe platform balance, ví dụ "usd".
     * sourceChargeId: charge gốc của booking, dùng cho source_transaction.
     * balanceTransactionId: transaction settlement để đối soát Stripe balance.
     * settlementGrossAmount: số tiền gross sau FX trong settlement currency.
     * settlementFeeAmount: phí Stripe trừ trên charge.
     * settlementNetAmount: số tiền thật còn lại trong balance sau phí.
     * exchangeRate: tỷ giá Stripe dùng khi charge currency khác settlement currency.
     */
    private record StripeTransferPlan(
            long amount,
            String currency,
            String sourceChargeId,
            String balanceTransactionId,
            long settlementGrossAmount,
            long settlementFeeAmount,
            long settlementNetAmount,
            BigDecimal exchangeRate
    ) {
    }
}
