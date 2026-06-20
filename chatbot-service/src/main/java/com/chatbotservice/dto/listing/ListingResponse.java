package com.chatbotservice.dto.listing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ListingResponse(
        UUID listingId,
        String hostId,
        String title,
        String description,
        String propertyType,
        String roomType,
        Integer numBedrooms,
        Integer numBeds,
        BigDecimal numBathrooms,
        Integer maxGuests,
        String address,
        String city,
        String state,
        String country,
        String postalCode,
        String status,
        Boolean instantBook,
        ListingPricingResponse pricing,
        List<ListingPhotoResponse> photos
) {
}
