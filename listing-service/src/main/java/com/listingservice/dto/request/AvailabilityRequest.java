package com.listingservice.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AvailabilityRequest {
    
    @NotNull(message = "DATE_REQUIRED")
    LocalDate date;
    
    @NotNull(message = "IS_AVAILABLE_REQUIRED")
    Boolean isAvailable;
    
    @Min(value = 1, message = "MIN_NIGHTS_INVALID")
    Integer minNights;
    
    @Min(value = 1, message = "MAX_NIGHTS_INVALID")
    Integer maxNights;
}