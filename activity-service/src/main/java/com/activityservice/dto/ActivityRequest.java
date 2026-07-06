package com.activityservice.dto;

import com.activityservice.model.ActivityEventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ActivityRequest(
    @NotBlank String keycloakUserId,
    @NotBlank String listingId,
    @NotNull ActivityEventType eventType
) {
}

