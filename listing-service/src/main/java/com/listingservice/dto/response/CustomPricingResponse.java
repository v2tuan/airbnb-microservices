package com.listingservice.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CustomPricingResponse {
    
    UUID customPricingId;
    UUID listingId;
    LocalDate date;
    BigDecimal price;
    LocalDateTime createdAt;
}