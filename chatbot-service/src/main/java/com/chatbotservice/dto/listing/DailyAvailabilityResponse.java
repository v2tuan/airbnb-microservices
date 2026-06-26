package com.chatbotservice.dto.listing;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDate;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DailyAvailabilityResponse(
        LocalDate date,
        Boolean available,
        List<String> reasons
) {
}
