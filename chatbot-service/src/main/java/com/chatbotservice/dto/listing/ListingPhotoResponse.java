package com.chatbotservice.dto.listing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ListingPhotoResponse(
        UUID photoId,
        UUID listingId,
        String photoUrl,
        String caption,
        Integer displayOrder,
        Boolean isCover
) {
}
