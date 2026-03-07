package com.listingservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ListingPricingRequest {
    
    @NotNull(message = "BASE_PRICE_REQUIRED")
    @DecimalMin(value = "0.0", inclusive = false, message = "BASE_PRICE_INVALID")
    BigDecimal basePrice;
    
    @Size(min = 3, max = 3, message = "CURRENCY_INVALID")
    String currency;
    
    @DecimalMin(value = "0.0", message = "CLEANING_FEE_INVALID")
    BigDecimal cleaningFee;
    
    @DecimalMin(value = "0.0", message = "SERVICE_FEE_INVALID")
    @DecimalMax(value = "100.0", message = "SERVICE_FEE_INVALID")
    BigDecimal serviceFeePercentage;
    
    @DecimalMin(value = "0.0", inclusive = false, message = "WEEKEND_PRICE_INVALID")
    BigDecimal weekendPrice;
    
    @DecimalMin(value = "0.0", message = "WEEKLY_DISCOUNT_INVALID")
    @DecimalMax(value = "100.0", message = "WEEKLY_DISCOUNT_INVALID")
    BigDecimal weeklyDiscount;
    
    @DecimalMin(value = "0.0", message = "MONTHLY_DISCOUNT_INVALID")
    @DecimalMax(value = "100.0", message = "MONTHLY_DISCOUNT_INVALID")
    BigDecimal monthlyDiscount;
}