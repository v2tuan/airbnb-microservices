package com.chatbotservice.dto.listing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ListingPricingResponse(
        UUID pricingId,
        UUID listingId,
        BigDecimal basePrice,
        String currency,
        BigDecimal cleaningFee,
        BigDecimal serviceFeePercentage,
        BigDecimal weekendPrice,
        BigDecimal weeklyDiscount,
        BigDecimal monthlyDiscount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
