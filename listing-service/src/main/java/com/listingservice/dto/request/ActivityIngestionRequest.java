package com.listingservice.dto.request;

import com.listingservice.constant.ActivityEventType;

public record ActivityIngestionRequest(
        String userId,
        String listingId,
        ActivityEventType eventType
) {
}
