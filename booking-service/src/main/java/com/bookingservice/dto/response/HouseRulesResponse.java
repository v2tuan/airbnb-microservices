package com.bookingservice.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HouseRulesResponse {
    
    UUID ruleId;
    UUID listingId;
    LocalTime checkInFrom;
    LocalTime checkInTo;
    LocalTime checkOutTime;
    Boolean smokingAllowed;
    Boolean petsAllowed;
    Boolean partiesAllowed;
    Boolean childrenAllowed;
    String additionalRules;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}