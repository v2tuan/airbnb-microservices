package com.listingservice.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ListingAccessInfoResponse {

    UUID accessInfoId;
    UUID listingId;
    String wifiPassword;
    String entryCode;
    String smartLockInstructions;
    String keyPickupInstructions;
    List<GuideStepResponse> checkInGuide;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class GuideStepResponse {
        UUID guideStepId;
        Integer stepNumber;
        String title;
        String description;
        String imageUrl;
    }
}
