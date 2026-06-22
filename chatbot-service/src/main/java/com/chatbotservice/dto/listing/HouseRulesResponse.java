package com.chatbotservice.dto.listing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HouseRulesResponse(
        UUID ruleId,
        UUID listingId,
        LocalTime checkInFrom,
        LocalTime checkInTo,
        LocalTime checkOutTime,
        Boolean smokingAllowed,
        Boolean petsAllowed,
        Boolean partiesAllowed,
        Boolean childrenAllowed,
        String additionalRules,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
