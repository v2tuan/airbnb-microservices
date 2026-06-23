package com.chatbotservice.dto.listing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
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
        BigDecimal latitude,
        BigDecimal longitude,
        String status,
        Boolean instantBook,
        LocalTime checkInStartTime,
        LocalTime checkInEndTime,
        LocalTime checkOutTime,
        String cancellationPolicyCode,
        LocalDateTime suspendedUntil,
        String suspensionReason,
        List<ListingPhotoResponse> photos,
        List<AmenityResponse> amenities,
        ListingPricingResponse pricing,
        HouseRulesResponse houseRules,
        ListingAccessInfoResponse accessInfo,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
