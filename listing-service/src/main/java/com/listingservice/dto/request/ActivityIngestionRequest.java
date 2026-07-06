package com.listingservice.dto.request;

import com.listingservice.constant.ActivityEventType;

public record ActivityIngestionRequest(
        String keycloakUserId,
        String listingId,
        ActivityEventType eventType
) {
}
