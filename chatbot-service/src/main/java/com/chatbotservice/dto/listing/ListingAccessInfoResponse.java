package com.chatbotservice.dto.listing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ListingAccessInfoResponse(
        UUID accessInfoId,
        UUID listingId,
        String wifiPassword,
        String entryCode,
        String smartLockInstructions,
        String keyPickupInstructions,
        List<GuideStepResponse> checkInGuide
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GuideStepResponse(
            UUID guideStepId,
            Integer stepNumber,
            String title,
            String description,
            String imageUrl
    ) {
    }
}
