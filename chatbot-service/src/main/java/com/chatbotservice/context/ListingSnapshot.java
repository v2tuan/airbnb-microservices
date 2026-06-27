package com.chatbotservice.context;

import java.math.BigDecimal;
import java.util.UUID;

public record ListingSnapshot(
        UUID listingId,
        String title,
        String city,
        String country,
        BigDecimal basePrice,
        String currency,
        Integer maxGuests,
        String roomType,
        String propertyType
) {
}
