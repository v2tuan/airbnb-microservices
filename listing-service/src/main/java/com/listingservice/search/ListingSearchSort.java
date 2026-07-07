package com.listingservice.search;

import java.util.Locale;

public enum ListingSearchSort {
    RELEVANCE,
    PRICE_ASC,
    PRICE_DESC,
    CREATED_ASC,
    CREATED_DESC,
    GUESTS_DESC;

    public static ListingSearchSort from(String value) {
        if (value == null || value.isBlank()) {
            return RELEVANCE;
        }

        String normalized = value.trim()
                .toUpperCase(Locale.ROOT)
                .replace('-', '_')
                .replaceAll("\\s+", "_");

        return switch (normalized) {
            case "PRICE_ASC", "LOWEST_PRICE", "CHEAPEST", "GIA_THAP_NHAT" -> PRICE_ASC;
            case "PRICE_DESC", "HIGHEST_PRICE", "MOST_EXPENSIVE", "GIA_CAO_NHAT" -> PRICE_DESC;
            case "CREATED_ASC", "OLDEST", "CU_NHAT" -> CREATED_ASC;
            case "CREATED_DESC", "NEWEST", "MOI_NHAT" -> CREATED_DESC;
            case "GUESTS_DESC", "MANY_GUESTS" -> GUESTS_DESC;
            default -> RELEVANCE;
        };
    }
}
