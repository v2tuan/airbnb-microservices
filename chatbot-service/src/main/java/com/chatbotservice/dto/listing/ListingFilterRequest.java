package com.chatbotservice.dto.listing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ListingFilterRequest(
        String keyword,
        String city,
        String state,
        String country,
        Integer guests,
        Integer minBedrooms,
        Integer minBeds,
        BigDecimal minBathrooms,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        List<String> propertyTypes,
        List<String> roomTypes,
        Boolean instantBook,
        List<String> amenityNames,
        BigDecimal latitude,
        BigDecimal longitude,
        Double radiusKm,
        LocalDate checkIn,
        LocalDate checkOut,
        String sortBy,
        Integer limit
) {
}
