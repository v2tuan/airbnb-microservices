package com.listingservice.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AvailabilityResponse {
    
    UUID availabilityId;
    UUID listingId;
    LocalDate date;
    Boolean isAvailable;
    Integer minNights;
    Integer maxNights;
    LocalDateTime updatedAt;
}