package com.bookingservice.event;

import java.time.Instant;
import java.util.Map;

public record NotificationEvent(
        String eventType,
        String channel,
        String recipientId,
        String recipientRole,
        Map<String, Object> payload,
        Instant occurredAt
) {
}
