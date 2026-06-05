package com.paymentservice.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record RefundFailedEvent(
        UUID refundId,
        UUID bookingId,
        UUID paymentId,
        Long amount,
        String currency,
        String failureReason,
        LocalDateTime occurredAt
) {
}
