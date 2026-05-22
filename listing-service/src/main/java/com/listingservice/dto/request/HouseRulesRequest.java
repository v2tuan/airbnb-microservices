package com.listingservice.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HouseRulesRequest {
    
    @NotNull(message = "CHECK_IN_FROM_REQUIRED")
    LocalTime checkInFrom;

    @NotNull(message = "CHECK_IN_TO_REQUIRED")
    LocalTime checkInTo;
    
    @NotNull(message = "CHECK_OUT_TIME_REQUIRED")
    LocalTime checkOutTime;
    
    Boolean smokingAllowed;
    
    Boolean petsAllowed;
    
    Boolean partiesAllowed;
    
    Boolean childrenAllowed;
    
    String additionalRules;
}
