package com.listingservice.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CustomPricingRequest {
    
    @NotNull(message = "DATE_REQUIRED")
    LocalDate date;
    
    @NotNull(message = "PRICE_REQUIRED")
    @DecimalMin(value = "0.0", inclusive = false, message = "PRICE_INVALID")
    BigDecimal price;
}