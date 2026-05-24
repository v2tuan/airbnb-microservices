package com.paymentservice.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record PaymentSucceededEvent(
        UUID paymentId,
        UUID bookingId,
        UUID guestId,
        UUID hostId,
        String paymentIntentId,
        Long amount,
        Long platformFeeAmount,
        Long hostAmount,
        String currency,
        LocalDateTime occurredAt
) {
}
