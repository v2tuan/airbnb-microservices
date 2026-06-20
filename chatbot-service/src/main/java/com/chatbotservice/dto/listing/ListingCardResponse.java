package com.chatbotservice.dto.listing;

import java.math.BigDecimal;

public record ListingCardResponse(
        String listingId,
        String title,
        String city,
        String country,
        BigDecimal basePrice,
        String currency,
        String coverPhoto,
        Integer maxGuests,
        Boolean instantBook,
        String roomType,
        String propertyType
) {
}
