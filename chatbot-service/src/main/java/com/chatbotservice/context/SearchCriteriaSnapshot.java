package com.chatbotservice.context;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SearchCriteriaSnapshot(
        String keyword,
        String city,
        String state,
        String country,
        Integer guests,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        List<String> amenityNames,
        LocalDate checkIn,
        LocalDate checkOut,
        String sortBy
) {
}
