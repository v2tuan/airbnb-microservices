package com.listingservice.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ListingAccessInfoRequest {

    @Size(max = 255, message = "WIFI_PASSWORD_TOO_LONG")
    String wifiPassword;

    @Size(max = 100, message = "ENTRY_CODE_TOO_LONG")
    String entryCode;

    String smartLockInstructions;

    String keyPickupInstructions;

    @Valid
    List<GuideStepRequest> checkInGuide;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class GuideStepRequest {
        Integer stepNumber;

        @Size(max = 150, message = "GUIDE_STEP_TITLE_TOO_LONG")
        String title;

        String description;

        String imageUrl;
    }
}
