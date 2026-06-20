package com.chatbotservice.tool;

import com.chatbotservice.client.ListingFeignClient;
import com.chatbotservice.configuration.ChatbotProperties;
import com.chatbotservice.dto.listing.ApiResponse;
import com.chatbotservice.dto.listing.ListingCardResponse;
import com.chatbotservice.dto.listing.ListingPhotoResponse;
import com.chatbotservice.dto.listing.ListingPricingResponse;
import com.chatbotservice.dto.listing.ListingResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Component
@Slf4j
public class ListingTool {
    private final ListingFeignClient listingFeignClient;
    private final ChatbotProperties properties;

    public ListingTool(ListingFeignClient listingFeignClient, ChatbotProperties properties) {
        this.listingFeignClient = listingFeignClient;
        this.properties = properties;
    }

    @Tool(
            name = "search_listings",
            description = """
                    Search active Airbnb listings by city, guest count, optional check-in/check-out dates,
                    and optional nightly base price range. Use this tool whenever the user asks for real listings,
                    room recommendations, prices, capacity, or stays in a city.
                    """
    )
    public String searchListings(
            @ToolParam(required = false, description = "City name, for example Hanoi, Da Nang, Dalat, Ho Chi Minh City.")
            String city,
            @ToolParam(required = false, description = "Minimum number of guests the listing must support.")
            Integer guests,
            @ToolParam(required = false, description = "Minimum nightly base price.")
            BigDecimal minPrice,
            @ToolParam(required = false, description = "Maximum nightly base price.")
            BigDecimal maxPrice,
            @ToolParam(required = false, description = "Check-in date in ISO format yyyy-MM-dd.")
            LocalDate checkIn,
            @ToolParam(required = false, description = "Check-out date in ISO format yyyy-MM-dd.")
            LocalDate checkOut,
            ToolContext toolContext
    ) {
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            return "INVALID_SEARCH_FILTER: minPrice must be less than or equal to maxPrice.";
        }

        if (checkIn != null && checkOut != null && !checkOut.isAfter(checkIn)) {
            return "INVALID_SEARCH_FILTER: checkOut must be after checkIn.";
        }

        try {
            ApiResponse<List<ListingResponse>> response = listingFeignClient
                    .searchListings(city, guests, checkIn, checkOut);

            List<ListingResponse> listings = safeData(response)
                    .stream()
                    .filter(listing -> matchesPrice(listing, minPrice, maxPrice))
                    .sorted(Comparator.comparing(this::basePriceOrMax))
                    .limit(properties.listing().maxResults())
                    .toList();

            if (listings.isEmpty()) {
                return "NO_LISTINGS_FOUND: No active listings matched the requested filters.";
            }

            addListingCardsToContext(toolContext, listings);

            return formatResults(listings);
        } catch (Exception exception) {
            log.warn("Listing tool failed", exception);
            return "LISTING_SERVICE_ERROR: listing-service is currently unavailable or timed out.";
        }
    }

    private List<ListingResponse> safeData(ApiResponse<List<ListingResponse>> response) {
        return response != null && response.data() != null
                ? response.data()
                : List.of();
    }

    @SuppressWarnings("unchecked")
    private void addListingCardsToContext(ToolContext toolContext, List<ListingResponse> listings) {
        if (toolContext == null || toolContext.getContext() == null) {
            return;
        }

        Object value = toolContext.getContext().get("listingCards");
        if (!(value instanceof List<?> cards)) {
            return;
        }

        // ToolContext is Spring AI's per-request runtime map. It is not sent to the model,
        // so this is a safe place to collect structured card data for the SSE response.
        List<ListingCardResponse> typedCards = (List<ListingCardResponse>) cards;
        listings.stream()
                .map(this::toCardResponse)
                .forEach(typedCards::add);
    }

    private ListingCardResponse toCardResponse(ListingResponse listing) {
        ListingPricingResponse pricing = listing.pricing();

        return new ListingCardResponse(
                listing.listingId() != null ? listing.listingId().toString() : null,
                listing.title(),
                listing.city(),
                listing.country(),
                pricing != null ? pricing.basePrice() : null,
                pricing != null ? pricing.currency() : null,
                coverPhoto(listing),
                listing.maxGuests(),
                listing.instantBook(),
                listing.roomType(),
                listing.propertyType()
        );
    }

    private boolean matchesPrice(ListingResponse listing, BigDecimal minPrice, BigDecimal maxPrice) {
        BigDecimal basePrice = basePrice(listing);

        if (basePrice == null) {
            return minPrice == null && maxPrice == null;
        }

        if (minPrice != null && basePrice.compareTo(minPrice) < 0) {
            return false;
        }

        return maxPrice == null || basePrice.compareTo(maxPrice) <= 0;
    }

    private BigDecimal basePriceOrMax(ListingResponse listing) {
        BigDecimal basePrice = basePrice(listing);
        return basePrice != null ? basePrice : BigDecimal.valueOf(Long.MAX_VALUE);
    }

    private BigDecimal basePrice(ListingResponse listing) {
        ListingPricingResponse pricing = listing != null ? listing.pricing() : null;
        return pricing != null ? pricing.basePrice() : null;
    }

    private String formatResults(List<ListingResponse> listings) {
        StringBuilder builder = new StringBuilder();
        builder.append("LISTINGS_FOUND: ").append(listings.size()).append(" result(s).\n");
        builder.append("Use these real listing records. Do not invent missing fields.\n\n");

        for (int index = 0; index < listings.size(); index++) {
            ListingResponse listing = listings.get(index);
            ListingPricingResponse pricing = listing.pricing();

            builder.append(index + 1).append(". ")
                    .append(nullToDash(listing.title()))
                    .append("\n");
            builder.append("   - listingId: ").append(listing.listingId()).append("\n");
            builder.append("   - city: ").append(nullToDash(listing.city())).append("\n");
            builder.append("   - country: ").append(nullToDash(listing.country())).append("\n");
            builder.append("   - maxGuests: ").append(nullToDash(listing.maxGuests())).append("\n");
            builder.append("   - bedrooms: ").append(nullToDash(listing.numBedrooms())).append("\n");
            builder.append("   - beds: ").append(nullToDash(listing.numBeds())).append("\n");
            builder.append("   - bathrooms: ").append(nullToDash(listing.numBathrooms())).append("\n");
            builder.append("   - roomType: ").append(nullToDash(listing.roomType())).append("\n");
            builder.append("   - propertyType: ").append(nullToDash(listing.propertyType())).append("\n");
            builder.append("   - basePrice: ").append(pricing != null ? nullToDash(pricing.basePrice()) : "-").append("\n");
            builder.append("   - currency: ").append(pricing != null ? nullToDash(pricing.currency()) : "-").append("\n");
            builder.append("   - instantBook: ").append(nullToDash(listing.instantBook())).append("\n");
            builder.append("   - coverPhoto: ").append(coverPhoto(listing)).append("\n");
        }

        return builder.toString();
    }

    private String coverPhoto(ListingResponse listing) {
        if (listing.photos() == null || listing.photos().isEmpty()) {
            return "-";
        }

        return listing.photos()
                .stream()
                .filter(photo -> Boolean.TRUE.equals(photo.isCover()))
                .findFirst()
                .or(() -> listing.photos().stream().filter(Objects::nonNull).findFirst())
                .map(ListingPhotoResponse::photoUrl)
                .filter(value -> value != null && !value.isBlank())
                .orElse("-");
    }

    private String nullToDash(Object value) {
        return value != null ? value.toString() : "-";
    }
}
