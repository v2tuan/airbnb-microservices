package com.listingservice.dto.request;

import com.listingservice.constant.ActivityEventType;
import jakarta.validation.constraints.NotNull;

public record ListingActivityRequest(
        @NotNull ActivityEventType eventType
) {
}
