package com.paymentservice.service;

import com.paymentservice.dto.request.BookingStatus;
import com.paymentservice.dto.response.BookingResponse;
import com.paymentservice.entity.Payment;
import com.paymentservice.entity.PaymentStatus;
import com.paymentservice.entity.Payout;
import com.paymentservice.event.PayoutCompletedEvent;
import com.paymentservice.repository.PaymentRepository;
import com.paymentservice.repository.PayoutRepository;
import com.paymentservice.repository.client.BookingClient;
import com.stripe.exception.StripeException;
import com.stripe.model.Transfer;
import com.stripe.net.RequestOptions;
import com.stripe.param.TransferCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayoutService {
    private final PayoutRepository payoutRepository;
    private final PaymentRepository paymentRepository;
    private final BookingClient bookingClient;
    private final ServiceTokenProvider serviceTokenProvider;
    private final PaymentEventPublisher eventPublisher;

    @Transactional
    public void processDuePayouts() {
        LocalDateTime now = LocalDateTime.now();
        payoutRepository.findDueForProcessing(now).forEach(payout -> processSinglePayout(payout, now));
    }

    private void processSinglePayout(Payout payout, LocalDateTime now) {
        BookingResponse booking = bookingClient.getBooking(serviceTokenProvider.bearerToken(), payout.getBookingId());

        if (isCancelledStatus(booking.getStatus())) {
            payout.setStatus("CANCELLED");
            payout.setFailureReason("Booking was cancelled before payout");
            payoutRepository.save(payout);
            return;
        }

        if (!isPaymentEligibleForPayout(payout, now)) {
            return;
        }

        if (booking.getStatus() != BookingStatus.CHECKED_IN
                && booking.getStatus() != BookingStatus.CHECKED_OUT
                && booking.getStatus() != BookingStatus.COMPLETED) {
            payout.setStatus("PENDING_CHECKIN");
            payout.setScheduledAt(now.plusMinutes(30));
            payoutRepository.save(payout);
            return;
        }

        LocalDateTime eligibleAt = booking.getCheckedInAt() != null
                ? booking.getCheckedInAt().plusHours(24)
                : booking.getCheckInDate().atStartOfDay().plusDays(1);

        if (now.isBefore(eligibleAt)) {
            payout.setStatus("SCHEDULED");
            payout.setScheduledAt(eligibleAt);
            payoutRepository.save(payout);
            return;
        }

        try {
            payout.setStatus("PROCESSING");
            payoutRepository.saveAndFlush(payout);

            TransferCreateParams params = TransferCreateParams.builder()
                    .setAmount(payout.getHostEarnings().longValue())
                    .setCurrency(payout.getCurrency().toLowerCase())
                    .setDestination(payout.getHostStripeAccountId())
                    .putMetadata("bookingId", payout.getBookingId().toString())
                    .putMetadata("payoutId", payout.getPayoutId().toString())
                    .build();
            Transfer transfer = Transfer.create(params, RequestOptions.builder()
                    .setIdempotencyKey("payout_" + payout.getPayoutId())
                    .build());

            payout.setStripeTransferId(transfer.getId());
            payout.setStatus("COMPLETED");
            payout.setProcessedAt(LocalDateTime.now());
            payoutRepository.save(payout);

            eventPublisher.payoutCompleted(payout.getBookingId().toString(), new PayoutCompletedEvent(
                    payout.getPayoutId(),
                    payout.getBookingId(),
                    payout.getHostId(),
                    transfer.getId(),
                    payout.getHostEarnings().longValue(),
                    payout.getCurrency(),
                    LocalDateTime.now()
            ));
        } catch (StripeException ex) {
            scheduleRetry(payout, ex.getMessage());
        }
    }

    private void scheduleRetry(Payout payout, String reason) {
        int retryCount = payout.getRetryCount() == null ? 0 : payout.getRetryCount();
        retryCount++;
        payout.setRetryCount(retryCount);
        payout.setFailureReason(reason);
        payout.setStatus(retryCount >= 5 ? "FAILED" : "RETRY");
        payout.setNextRetryAt(LocalDateTime.now().plusMinutes(Math.min(60, retryCount * 10L)));
        payoutRepository.save(payout);
    }

    private boolean isPaymentEligibleForPayout(Payout payout, LocalDateTime now) {
        if (payout.getPaymentId() == null) {
            return true;
        }

        Payment payment = paymentRepository.findById(payout.getPaymentId()).orElse(null);
        if (payment == null) {
            payout.setStatus("FAILED");
            payout.setFailureReason("Payment record not found for payout");
            payoutRepository.save(payout);
            return false;
        }

        if (payment.getStatus() == PaymentStatus.PAID) {
            return true;
        }
        if (payment.getStatus() == PaymentStatus.PAYMENT_FAILED
                || payment.getStatus() == PaymentStatus.PAYMENT_CANCELLED
                || payment.getStatus() == PaymentStatus.REFUNDED) {
            payout.setStatus("CANCELLED");
            payout.setFailureReason("Payment is not payable: " + payment.getStatus());
            payoutRepository.save(payout);
            return false;
        }

        payout.setStatus("PENDING_CHECKIN");
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
}
