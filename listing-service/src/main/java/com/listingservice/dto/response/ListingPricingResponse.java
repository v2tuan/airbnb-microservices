package com.listingservice.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ListingPricingResponse {
    
    UUID pricingId;
    UUID listingId;
    BigDecimal basePrice;
    String currency;
    BigDecimal cleaningFee;
    BigDecimal serviceFeePercentage;
    BigDecimal weekendPrice;
    BigDecimal weeklyDiscount;
    BigDecimal monthlyDiscount;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}