package com.bookingservice.event;

import java.time.Instant;
import java.util.Map;

public record NotificationEvent(
        String eventType,
        String channel,
        String recipientId,
        String recipientRole,
        String title,
        String message,
        Map<String, Object> meta,
        Map<String, Object> payload,
        Instant occurredAt
) {
}
