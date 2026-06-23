package com.chatbotservice.dto.listing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AmenityResponse(
        UUID amenityId,
        String name,
        String category,
        String iconUrl,
        LocalDateTime createdAt
) {
}
