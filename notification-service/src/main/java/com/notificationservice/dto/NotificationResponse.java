package com.notificationservice.dto;

import lombok.Builder;

import java.time.Instant;
import java.util.Map;

@Builder
public record NotificationResponse(
        String id,
        String type,
        String title,
        String message,
        Map<String, Object> meta,
        boolean read,
        Instant createdAt
) {
}
