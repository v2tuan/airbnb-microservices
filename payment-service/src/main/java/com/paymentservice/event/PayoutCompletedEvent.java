package com.paymentservice.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record PayoutCompletedEvent(
        UUID payoutId,
        UUID bookingId,
        UUID hostId,
        String stripeTransferId,
        Long amount,
        String currency,
        LocalDateTime occurredAt
) {
}
