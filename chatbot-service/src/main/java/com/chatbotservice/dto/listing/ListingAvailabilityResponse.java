package com.chatbotservice.dto.listing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ListingAvailabilityResponse(
        UUID listingId,
        LocalDate checkIn,
        LocalDate checkOut,
        Long nights,
        Boolean available,
        List<LocalDate> availableDates,
        List<LocalDate> unavailableDates,
        List<DailyAvailabilityResponse> dailyAvailability,
        List<String> reasons,
        String message
) {
}
