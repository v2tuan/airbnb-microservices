package com.listingservice.search;

import com.listingservice.constant.PropertyType;
import com.listingservice.constant.RoomType;
import com.listingservice.dto.request.ListingFilterRequest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

public record ListingSearchCriteria(
        String keyword,
        String city,
        String state,
        String country,
        Integer guests,
        Integer minBedrooms,
        Integer minBeds,
        BigDecimal minBathrooms,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        List<PropertyType> propertyTypes,
        List<RoomType> roomTypes,
        Boolean instantBook,
        ListingSearchSort sort,
        int limit
) {
    public static ListingSearchCriteria from(ListingFilterRequest request, int limit) {
        ListingFilterRequest source = request != null ? request : new ListingFilterRequest();

        return new ListingSearchCriteria(
                normalizeText(source.getKeyword()),
                normalizeText(source.getCity()),
                normalizeText(source.getState()),
                normalizeText(source.getCountry()),
                source.getGuests(),
                source.getMinBedrooms(),
                source.getMinBeds(),
                source.getMinBathrooms(),
                source.getMinPrice(),
                source.getMaxPrice(),
                nonNullValues(source.getPropertyTypes()),
                nonNullValues(source.getRoomTypes()),
                source.getInstantBook(),
                ListingSearchSort.from(source.getSortBy()),
                limit
        );
    }

    public boolean hasPriceFilter() {
        return minPrice != null || maxPrice != null;
    }

    public boolean sortsByPrice() {
        return sort == ListingSearchSort.PRICE_ASC || sort == ListingSearchSort.PRICE_DESC;
    }

    private static String normalizeText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static <T> List<T> nonNullValues(List<T> values) {
        if (values == null) {
            return List.of();
        }

        return values.stream()
                .filter(Objects::nonNull)
                .toList();
    }
}
