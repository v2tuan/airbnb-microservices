package com.chatbotservice.conversation;

import com.chatbotservice.dto.listing.ListingCardResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

public record ConversationListingContext(
        String keyword,
        String city,
        String state,
        String country,
        Integer guests,
        String propertyType,
        String roomType,
        Integer minBedrooms,
        Integer minBeds,
        BigDecimal minBathrooms,
        Boolean instantBook,
        List<String> amenityNames,
        BigDecimal latitude,
        BigDecimal longitude,
        Double radiusKm,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        LocalDate checkIn,
        LocalDate checkOut,
        String sortBy,
        BigDecimal lowestPrice,
        BigDecimal highestPrice,
        List<ListingCardResponse> listings,
        Instant updatedAt
) {
    public ConversationListingContext {
        amenityNames = amenityNames != null ? List.copyOf(amenityNames) : List.of();
        listings = listings != null ? List.copyOf(listings) : List.of();
        updatedAt = updatedAt != null ? updatedAt : Instant.now();
    }

    public String toPromptBlock() {
        StringBuilder builder = new StringBuilder();
        builder.append("""
                Ngu canh tim kiem listing gan nhat cua cuoc hoi thoai nay:
                - Chi dung phan nay khi cau hoi hien tai phu thuoc ngu canh truoc do, vi du: "re hon", "dat hon", "can khac", "can thu 2", "o do".
                - Neu nguoi dung dua filter moi ro rang, uu tien filter moi cua nguoi dung.
                """);

        appendIfPresent(builder, "keyword", keyword);
        appendIfPresent(builder, "city", city);
        appendIfPresent(builder, "state", state);
        appendIfPresent(builder, "country", country);
        appendIfPresent(builder, "guests", guests);
        appendIfPresent(builder, "propertyType", propertyType);
        appendIfPresent(builder, "roomType", roomType);
        appendIfPresent(builder, "minBedrooms", minBedrooms);
        appendIfPresent(builder, "minBeds", minBeds);
        appendIfPresent(builder, "minBathrooms", minBathrooms);
        appendIfPresent(builder, "instantBook", instantBook);
        appendIfPresent(builder, "amenityNames", amenityNames.isEmpty() ? null : amenityNames);
        appendIfPresent(builder, "latitude", latitude);
        appendIfPresent(builder, "longitude", longitude);
        appendIfPresent(builder, "radiusKm", radiusKm);
        appendIfPresent(builder, "minPrice", minPrice);
        appendIfPresent(builder, "maxPrice", maxPrice);
        appendIfPresent(builder, "checkIn", checkIn);
        appendIfPresent(builder, "checkOut", checkOut);
        appendIfPresent(builder, "sortBy", sortBy);
        appendIfPresent(builder, "lowestShownPrice", lowestPrice);
        appendIfPresent(builder, "highestShownPrice", highestPrice);

        if (!listings.isEmpty()) {
            builder.append("- Listings da hien thi gan nhat:\n");
            listings.stream()
                    .filter(Objects::nonNull)
                    .limit(6)
                    .forEach(listing -> builder
                            .append("  + ")
                            .append(nullToDash(listing.title()))
                            .append(" | listingId=")
                            .append(nullToDash(listing.listingId()))
                            .append(" | city=")
                            .append(nullToDash(listing.city()))
                            .append(" | maxGuests=")
                            .append(nullToDash(listing.maxGuests()))
                            .append(" | roomType=")
                            .append(nullToDash(listing.roomType()))
                            .append(" | propertyType=")
                            .append(nullToDash(listing.propertyType()))
                            .append(" | basePrice=")
                            .append(nullToDash(listing.basePrice()))
                            .append(" ")
                            .append(nullToDash(listing.currency()))
                            .append("\n"));
        }

        return builder.toString();
    }

    private static void appendIfPresent(StringBuilder builder, String label, Object value) {
        if (value != null && !value.toString().isBlank()) {
            builder.append("- ").append(label).append(": ").append(value).append("\n");
        }
    }

    private static String nullToDash(Object value) {
        return value != null ? value.toString() : "-";
    }
}
