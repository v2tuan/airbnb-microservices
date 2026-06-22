package com.chatbotservice.tool;

import com.chatbotservice.client.ListingFeignClient;
import com.chatbotservice.configuration.ChatbotProperties;
import com.chatbotservice.conversation.ConversationListingContext;
import com.chatbotservice.conversation.ConversationListingContextStore;
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
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

@Component
@Slf4j
public class ListingTool {
    private static final String LISTING_CARDS_CONTEXT_KEY = "listingCards";
    private static final String CONVERSATION_KEY_CONTEXT_KEY = "conversationKey";
    private static final String CURRENT_MESSAGE_CONTEXT_KEY = "currentMessage";

    private final ListingFeignClient listingFeignClient;
    private final ChatbotProperties properties;
    private final ConversationListingContextStore listingContextStore;

    public ListingTool(
            ListingFeignClient listingFeignClient,
            ChatbotProperties properties,
            ConversationListingContextStore listingContextStore
    ) {
        this.listingFeignClient = listingFeignClient;
        this.properties = properties;
        this.listingContextStore = listingContextStore;
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
        // Ghi log tất cả các tham số trên một dòng (Dễ parse log bằng các công cụ như ELK, Splunk)
        log.info("Searching listings with params - City: {}, Guests: {}, MinPrice: {}, MaxPrice: {}, CheckIn: {}, CheckOut: {}",
                city, guests, minPrice, maxPrice, checkIn, checkOut);

        ConversationListingContext previousContext = previousContext(toolContext).orElse(null);
        SearchFilters filters = mergeWithConversationContext(
                city,
                guests,
                minPrice,
                maxPrice,
                checkIn,
                checkOut,
                currentMessage(toolContext),
                previousContext
        );

        if (filters.minPrice() != null && filters.maxPrice() != null
                && filters.minPrice().compareTo(filters.maxPrice()) > 0) {
            return "INVALID_SEARCH_FILTER: minPrice must be less than or equal to maxPrice.";
        }

        if (filters.checkIn() != null && filters.checkOut() != null && !filters.checkOut().isAfter(filters.checkIn())) {
            return "INVALID_SEARCH_FILTER: checkOut must be after checkIn.";
        }

        try {
            ApiResponse<List<ListingResponse>> response = listingFeignClient
                    .searchListings(filters.city(), filters.guests(), filters.checkIn(), filters.checkOut());

            List<ListingResponse> listings = safeData(response)
                    .stream()
                    .filter(listing -> matchesPrice(listing, filters.minPrice(), filters.maxPrice()))
                    .sorted(Comparator.comparing(this::basePriceOrMax))
                    .limit(properties.listing().maxResults())
                    .toList();

            if (listings.isEmpty()) {
                return "NO_LISTINGS_FOUND: No active listings matched the requested filters.";
            }

            List<ListingCardResponse> listingCards = listings.stream()
                    .map(this::toCardResponse)
                    .toList();

            addListingCardsToContext(toolContext, listingCards);
            saveConversationContext(toolContext, filters, listingCards);

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
    private void addListingCardsToContext(ToolContext toolContext, List<ListingCardResponse> listingCards) {
        if (toolContext == null || toolContext.getContext() == null) {
            return;
        }

        Object value = toolContext.getContext().get(LISTING_CARDS_CONTEXT_KEY);
        if (!(value instanceof List<?> cards)) {
            return;
        }

        // ToolContext is Spring AI's per-request runtime map. It is not sent to the model,
        // so this is a safe place to collect structured card data for the SSE response.
        List<ListingCardResponse> typedCards = (List<ListingCardResponse>) cards;
        typedCards.addAll(listingCards);
    }

    private void saveConversationContext(
            ToolContext toolContext,
            SearchFilters filters,
            List<ListingCardResponse> listingCards
    ) {
        String conversationKey = stringContextValue(toolContext, CONVERSATION_KEY_CONTEXT_KEY);
        if (!StringUtils.hasText(conversationKey)) {
            return;
        }

        listingContextStore.save(
                conversationKey,
                new ConversationListingContext(
                        filters.city(),
                        filters.guests(),
                        filters.minPrice(),
                        filters.maxPrice(),
                        filters.checkIn(),
                        filters.checkOut(),
                        lowestPrice(listingCards),
                        highestPrice(listingCards),
                        listingCards,
                        Instant.now()
                )
        );
    }

    private SearchFilters mergeWithConversationContext(
            String city,
            Integer guests,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            LocalDate checkIn,
            LocalDate checkOut,
            String currentMessage,
            ConversationListingContext previousContext
    ) {
        return new SearchFilters(city, guests, minPrice, maxPrice, checkIn, checkOut);

//        if (previousContext == null) {
//            return new SearchFilters(city, guests, minPrice, maxPrice, checkIn, checkOut);
//        }
//
//        boolean asksForCheaperListings = containsAny(
//                currentMessage,
//                "rẻ hơn",
//                "re hon",
//                "giá thấp hơn",
//                "gia thap hon",
//                "thấp hơn",
//                "thap hon",
//                "cheaper",
//                "less expensive"
//        );
//        boolean asksForMoreExpensiveListings = containsAny(
//                currentMessage,
//                "đắt hơn",
//                "dat hon",
//                "mắc hơn",
//                "mac hon",
//                "cao cấp hơn",
//                "cao cap hon",
//                "more expensive"
//        );
//
//        String effectiveCity = StringUtils.hasText(city) ? city : previousContext.city();
//        Integer effectiveGuests = guests != null ? guests : previousContext.guests();
//        LocalDate effectiveCheckIn = checkIn != null ? checkIn : previousContext.checkIn();
//        LocalDate effectiveCheckOut = checkOut != null ? checkOut : previousContext.checkOut();
//        BigDecimal effectiveMinPrice = minPrice != null ? minPrice : previousContext.minPrice();
//        BigDecimal effectiveMaxPrice = maxPrice != null ? maxPrice : previousContext.maxPrice();
//
//        // LLMs usually infer "rẻ hơn" from chat memory, but this deterministic fallback
//        // keeps tool behavior correct when the model calls search_listings without a price.
//        if (asksForCheaperListings && maxPrice == null && previousContext.lowestPrice() != null) {
//            effectiveMaxPrice = priceBelow(previousContext.lowestPrice());
//            if (minPrice == null) {
//                effectiveMinPrice = null;
//            }
//        }
//
//        if (asksForMoreExpensiveListings && minPrice == null && previousContext.highestPrice() != null) {
//            effectiveMinPrice = priceAbove(previousContext.highestPrice());
//            if (maxPrice == null) {
//                effectiveMaxPrice = null;
//            }
//        }
//
//        return new SearchFilters(
//                effectiveCity,
//                effectiveGuests,
//                effectiveMinPrice,
//                effectiveMaxPrice,
//                effectiveCheckIn,
//                effectiveCheckOut
//        );
    }

    private Optional<ConversationListingContext> previousContext(ToolContext toolContext) {
        return listingContextStore.find(stringContextValue(toolContext, CONVERSATION_KEY_CONTEXT_KEY));
    }

    private String currentMessage(ToolContext toolContext) {
        return stringContextValue(toolContext, CURRENT_MESSAGE_CONTEXT_KEY);
    }

    private String stringContextValue(ToolContext toolContext, String key) {
        if (toolContext == null || toolContext.getContext() == null) {
            return null;
        }

        Object value = toolContext.getContext().get(key);
        return value != null ? value.toString() : null;
    }

    private boolean containsAny(String message, String... candidates) {
        if (!StringUtils.hasText(message)) {
            return false;
        }

        String normalized = message.toLowerCase(Locale.ROOT);
        for (String candidate : candidates) {
            if (normalized.contains(candidate)) {
                return true;
            }
        }

        return false;
    }

    private BigDecimal priceBelow(BigDecimal price) {
        return price.compareTo(BigDecimal.ONE) > 0 ? price.subtract(BigDecimal.ONE) : price;
    }

    private BigDecimal priceAbove(BigDecimal price) {
        return price.add(BigDecimal.ONE);
    }

    private BigDecimal lowestPrice(List<ListingCardResponse> listingCards) {
        return listingCards.stream()
                .map(ListingCardResponse::basePrice)
                .filter(Objects::nonNull)
                .min(BigDecimal::compareTo)
                .orElse(null);
    }

    private BigDecimal highestPrice(List<ListingCardResponse> listingCards) {
        return listingCards.stream()
                .map(ListingCardResponse::basePrice)
                .filter(Objects::nonNull)
                .max(BigDecimal::compareTo)
                .orElse(null);
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

    private record SearchFilters(
            String city,
            Integer guests,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            LocalDate checkIn,
            LocalDate checkOut
    ) {
    }
}
