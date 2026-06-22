package com.chatbotservice.conversation;

import com.chatbotservice.dto.listing.ListingCardResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

public record ConversationListingContext(
        String city,
        Integer guests,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        LocalDate checkIn,
        LocalDate checkOut,
        BigDecimal lowestPrice,
        BigDecimal highestPrice,
        List<ListingCardResponse> listings,
        Instant updatedAt
) {
    public ConversationListingContext {
        listings = listings != null ? List.copyOf(listings) : List.of();
        updatedAt = updatedAt != null ? updatedAt : Instant.now();
    }

    public String toPromptBlock() {
        StringBuilder builder = new StringBuilder();
        builder.append("""
                Ngữ cảnh tìm kiếm listing gần nhất của cuộc hội thoại này:
                - Chỉ dùng phần này khi câu hỏi hiện tại phụ thuộc ngữ cảnh trước đó, ví dụ: "rẻ hơn", "đắt hơn", "căn khác", "căn thứ 2", "ở đó".
                - Nếu người dùng đưa filter mới rõ ràng, ưu tiên filter mới của người dùng.
                """);

        appendIfPresent(builder, "city", city);
        appendIfPresent(builder, "guests", guests);
        appendIfPresent(builder, "minPrice", minPrice);
        appendIfPresent(builder, "maxPrice", maxPrice);
        appendIfPresent(builder, "checkIn", checkIn);
        appendIfPresent(builder, "checkOut", checkOut);
        appendIfPresent(builder, "lowestShownPrice", lowestPrice);
        appendIfPresent(builder, "highestShownPrice", highestPrice);

        if (!listings.isEmpty()) {
            builder.append("- Listings đã hiển thị gần nhất:\n");
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
