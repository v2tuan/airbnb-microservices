package com.chatbotservice.tool;

import com.chatbotservice.client.ListingFeignClient;
import com.chatbotservice.configuration.ChatbotProperties;
import com.chatbotservice.conversation.ConversationListingContext;
import com.chatbotservice.conversation.ConversationListingContextStore;
import com.chatbotservice.dto.listing.AmenityResponse;
import com.chatbotservice.dto.listing.ApiResponse;
import com.chatbotservice.dto.listing.HouseRulesResponse;
import com.chatbotservice.dto.listing.ListingAccessInfoResponse;
import com.chatbotservice.dto.listing.ListingCardResponse;
import com.chatbotservice.dto.listing.ListingFilterRequest;
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
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
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
                    Search active Airbnb listings with combined filters: keyword, city, state, country, guest count,
                    price range, property type, room type, bedrooms, beds, bathrooms, instant booking, amenities,
                    coordinates, radius, date availability, and sorting.
                    Use this tool whenever the user asks for real listings, room recommendations, prices, capacity,
                    amenities, or stays in a city.
                    """
    )
    public String searchListings(
            @ToolParam(required = false, description = "Free text keyword from the user, for example lake view, balcony, quiet, center.")
            String keyword,
            @ToolParam(required = false, description = "City name, for example Hanoi, Da Nang, Dalat, Ho Chi Minh City.")
            String city,
            @ToolParam(required = false, description = "State, province, or region when the user provides it.")
            String state,
            @ToolParam(required = false, description = "Country name, for example Vietnam.")
            String country,
            @ToolParam(required = false, description = "Minimum number of guests the listing must support.")
            Integer guests,
            @ToolParam(required = false, description = "Property type: APARTMENT, HOUSE, VILLA, CONDO, TOWNHOUSE, COTTAGE, or BUNGALOW.")
            String propertyType,
            @ToolParam(required = false, description = "Room type: ENTIRE_PLACE, PRIVATE_ROOM, or SHARED_ROOM.")
            String roomType,
            @ToolParam(required = false, description = "Minimum number of bedrooms.")
            Integer minBedrooms,
            @ToolParam(required = false, description = "Minimum number of beds.")
            Integer minBeds,
            @ToolParam(required = false, description = "Minimum number of bathrooms.")
            BigDecimal minBathrooms,
            @ToolParam(required = false, description = "Whether the listing must support instant booking.")
            Boolean instantBook,
            @ToolParam(required = false, description = "Amenity names requested by the user, for example wifi, pool, kitchen, parking.")
            List<String> amenityNames,
            @ToolParam(required = false, description = "Latitude when the user gives an exact coordinate or known place coordinate.")
            BigDecimal latitude,
            @ToolParam(required = false, description = "Longitude when the user gives an exact coordinate or known place coordinate.")
            BigDecimal longitude,
            @ToolParam(required = false, description = "Radius in kilometers around the provided latitude and longitude.")
            Double radiusKm,
            @ToolParam(required = false, description = "Minimum nightly base price.")
            BigDecimal minPrice,
            @ToolParam(required = false, description = "Maximum nightly base price.")
            BigDecimal maxPrice,
            @ToolParam(required = false, description = "Check-in date in ISO format yyyy-MM-dd.")
            LocalDate checkIn,
            @ToolParam(required = false, description = "Check-out date in ISO format yyyy-MM-dd.")
            LocalDate checkOut,
            @ToolParam(required = false, description = "Sort: RELEVANCE, PRICE_ASC, PRICE_DESC, CREATED_DESC, CREATED_ASC, or GUESTS_DESC.")
            String sortBy,
            ToolContext toolContext
    ) {
        log.info(
                "Searching listings with params - keyword={}, city={}, state={}, country={}, guests={}, propertyType={}, roomType={}, amenities={}, minPrice={}, maxPrice={}, checkIn={}, checkOut={}, sortBy={}",
                keyword,
                city,
                state,
                country,
                guests,
                propertyType,
                roomType,
                amenityNames,
                minPrice,
                maxPrice,
                checkIn,
                checkOut,
                sortBy
        );

        ConversationListingContext previousContext = previousContext(toolContext).orElse(null);
        SearchFilters filters = mergeWithConversationContext(
                keyword,
                city,
                state,
                country,
                guests,
                propertyType,
                roomType,
                minBedrooms,
                minBeds,
                minBathrooms,
                instantBook,
                amenityNames,
                latitude,
                longitude,
                radiusKm,
                minPrice,
                maxPrice,
                checkIn,
                checkOut,
                sortBy,
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
            List<String> propertyTypes = singleValueList(normalizePropertyType(filters.propertyType()));
            List<String> roomTypes = singleValueList(normalizeRoomType(filters.roomType()));
            List<String> normalizedAmenityNames = normalizeAmenityNames(filters.amenityNames());
            String normalizedSortBy = normalizeSortBy(filters.sortBy());

            ApiResponse<List<ListingResponse>> response = listingFeignClient.searchListingsWithFilters(
                    new ListingFilterRequest(
                            normalizeNullable(filters.keyword()),
                            normalizeCityName(filters.city()),
                            normalizeNullable(filters.state()),
                            normalizeNullable(filters.country()),
                            filters.guests(),
                            filters.minBedrooms(),
                            filters.minBeds(),
                            filters.minBathrooms(),
                            filters.minPrice(),
                            filters.maxPrice(),
                            propertyTypes,
                            roomTypes,
                            filters.instantBook(),
                            normalizedAmenityNames,
                            filters.latitude(),
                            filters.longitude(),
                            filters.radiusKm(),
                            filters.checkIn(),
                            filters.checkOut(),
                            normalizedSortBy,
                            properties.listing().maxResults()
                    )
            );

            List<ListingResponse> listings = safeData(response);

            if (listings.isEmpty()) {
                return "NO_LISTINGS_FOUND: No active listings matched the requested filters.";
            }

            List<ListingCardResponse> listingCards = listings.stream()
                    .map(this::toCardResponse)
                    .toList();

            addListingCardsToContext(toolContext, listingCards);
            saveConversationContext(
                    toolContext,
                    filters,
                    propertyTypes,
                    roomTypes,
                    normalizedAmenityNames,
                    normalizedSortBy,
                    listingCards
            );

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

        // ToolContext is request scoped runtime data. It is not sent back to the model,
        // so we can safely use it to collect structured cards for the SSE response.
        List<ListingCardResponse> typedCards = (List<ListingCardResponse>) cards;
        typedCards.addAll(listingCards);
    }

    private void saveConversationContext(
            ToolContext toolContext,
            SearchFilters filters,
            List<String> propertyTypes,
            List<String> roomTypes,
            List<String> amenityNames,
            String sortBy,
            List<ListingCardResponse> listingCards
    ) {
        String conversationKey = stringContextValue(toolContext, CONVERSATION_KEY_CONTEXT_KEY);
        if (!StringUtils.hasText(conversationKey)) {
            return;
        }

        listingContextStore.save(
                conversationKey,
                new ConversationListingContext(
                        normalizeNullable(filters.keyword()),
                        normalizeCityName(filters.city()),
                        normalizeNullable(filters.state()),
                        normalizeNullable(filters.country()),
                        filters.guests(),
                        firstValue(propertyTypes),
                        firstValue(roomTypes),
                        filters.minBedrooms(),
                        filters.minBeds(),
                        filters.minBathrooms(),
                        filters.instantBook(),
                        amenityNames,
                        filters.latitude(),
                        filters.longitude(),
                        filters.radiusKm(),
                        filters.minPrice(),
                        filters.maxPrice(),
                        filters.checkIn(),
                        filters.checkOut(),
                        sortBy,
                        lowestPrice(listingCards),
                        highestPrice(listingCards),
                        listingCards,
                        Instant.now()
                )
        );
    }

    private SearchFilters mergeWithConversationContext(
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
            String currentMessage,
            ConversationListingContext previousContext
    ) {
        return new SearchFilters(
                keyword,
                city,
                state,
                country,
                guests,
                propertyType,
                roomType,
                minBedrooms,
                minBeds,
                minBathrooms,
                instantBook,
                normalizeAmenityNames(amenityNames),
                latitude,
                longitude,
                radiusKm,
                minPrice,
                maxPrice,
                checkIn,
                checkOut,
                sortBy
        );

//        if (previousContext == null) {
//            return new SearchFilters(
//                    keyword,
//                    city,
//                    state,
//                    country,
//                    guests,
//                    propertyType,
//                    roomType,
//                    minBedrooms,
//                    minBeds,
//                    minBathrooms,
//                    instantBook,
//                    normalizeAmenityNames(amenityNames),
//                    latitude,
//                    longitude,
//                    radiusKm,
//                    minPrice,
//                    maxPrice,
//                    checkIn,
//                    checkOut,
//                    sortBy
//            );
//        }
//
//        boolean asksForCheaperListings = containsAny(
//                currentMessage,
//                "re hon",
//                "gia thap hon",
//                "thap hon",
//                "cheaper",
//                "less expensive"
//        );
//        boolean asksForMoreExpensiveListings = containsAny(
//                currentMessage,
//                "dat hon",
//                "mac hon",
//                "cao cap hon",
//                "more expensive"
//        );
//
//        String effectiveKeyword = StringUtils.hasText(keyword) ? keyword : previousContext.keyword();
//        String effectiveCity = StringUtils.hasText(city) ? city : previousContext.city();
//        String effectiveState = StringUtils.hasText(state) ? state : previousContext.state();
//        String effectiveCountry = StringUtils.hasText(country) ? country : previousContext.country();
//        Integer effectiveGuests = guests != null ? guests : previousContext.guests();
//        String effectivePropertyType = StringUtils.hasText(propertyType) ? propertyType : previousContext.propertyType();
//        String effectiveRoomType = StringUtils.hasText(roomType) ? roomType : previousContext.roomType();
//        Integer effectiveMinBedrooms = minBedrooms != null ? minBedrooms : previousContext.minBedrooms();
//        Integer effectiveMinBeds = minBeds != null ? minBeds : previousContext.minBeds();
//        BigDecimal effectiveMinBathrooms = minBathrooms != null ? minBathrooms : previousContext.minBathrooms();
//        Boolean effectiveInstantBook = instantBook != null ? instantBook : previousContext.instantBook();
//        List<String> effectiveAmenityNames = hasValues(amenityNames)
//                ? normalizeAmenityNames(amenityNames)
//                : previousContext.amenityNames();
//        BigDecimal effectiveLatitude = latitude != null ? latitude : previousContext.latitude();
//        BigDecimal effectiveLongitude = longitude != null ? longitude : previousContext.longitude();
//        Double effectiveRadiusKm = radiusKm != null ? radiusKm : previousContext.radiusKm();
//        LocalDate effectiveCheckIn = checkIn != null ? checkIn : previousContext.checkIn();
//        LocalDate effectiveCheckOut = checkOut != null ? checkOut : previousContext.checkOut();
//        BigDecimal effectiveMinPrice = minPrice != null ? minPrice : previousContext.minPrice();
//        BigDecimal effectiveMaxPrice = maxPrice != null ? maxPrice : previousContext.maxPrice();
//        String effectiveSortBy = StringUtils.hasText(sortBy) ? sortBy : previousContext.sortBy();
//
//        // This deterministic fallback protects follow-up searches when the model calls
//        // the tool with incomplete arguments, for example "con can nao re hon khong?".
//        if (asksForCheaperListings && maxPrice == null && previousContext.lowestPrice() != null) {
//            effectiveMaxPrice = priceBelow(previousContext.lowestPrice());
//            effectiveSortBy = "PRICE_ASC";
//            if (minPrice == null) {
//                effectiveMinPrice = null;
//            }
//        }
//
//        if (asksForMoreExpensiveListings && minPrice == null && previousContext.highestPrice() != null) {
//            effectiveMinPrice = priceAbove(previousContext.highestPrice());
//            effectiveSortBy = "PRICE_DESC";
//            if (maxPrice == null) {
//                effectiveMaxPrice = null;
//            }
//        }
//
//        return new SearchFilters(
//                effectiveKeyword,
//                effectiveCity,
//                effectiveState,
//                effectiveCountry,
//                effectiveGuests,
//                effectivePropertyType,
//                effectiveRoomType,
//                effectiveMinBedrooms,
//                effectiveMinBeds,
//                effectiveMinBathrooms,
//                effectiveInstantBook,
//                effectiveAmenityNames,
//                effectiveLatitude,
//                effectiveLongitude,
//                effectiveRadiusKm,
//                effectiveMinPrice,
//                effectiveMaxPrice,
//                effectiveCheckIn,
//                effectiveCheckOut,
//                effectiveSortBy
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

        String normalized = normalizeSearchText(message);
        for (String candidate : candidates) {
            if (normalized.contains(candidate)) {
                return true;
            }
        }

        return false;
    }

    private List<String> singleValueList(String value) {
        return StringUtils.hasText(value) ? List.of(value) : null;
    }

    private String firstValue(List<String> values) {
        return values != null && !values.isEmpty() ? values.getFirst() : null;
    }

    private boolean hasValues(List<String> values) {
        return values != null && values.stream().anyMatch(StringUtils::hasText);
    }

    private List<String> normalizeAmenityNames(List<String> values) {
        if (values == null) {
            return null;
        }

        List<String> normalized = values.stream()
                .filter(Objects::nonNull)
                .flatMap(value -> Arrays.stream(value.split(",")))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();

        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeNullable(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String normalizeCityName(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        String normalized = normalizeSearchText(value)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();

        return switch (normalized) {
            case "ha noi", "hanoi" -> "Hanoi";
            case "da nang", "danang" -> "Da Nang";
            case "da lat", "dalat" -> "Dalat";
            case "ho chi minh", "ho chi minh city", "hcm", "tp hcm", "tp ho chi minh", "sai gon", "saigon" -> "Ho Chi Minh City";
            default -> value.trim();
        };
    }

    private String normalizePropertyType(String value) {
        String normalized = normalizeEnumCandidate(value);
        if (normalized == null) {
            return null;
        }

        return switch (normalized) {
            case "APARTMENT", "APT", "CAN_HO" -> "APARTMENT";
            case "HOUSE", "HOME", "NHA" -> "HOUSE";
            case "VILLA", "BIET_THU" -> "VILLA";
            case "CONDO", "CONDOMINIUM" -> "CONDO";
            case "TOWNHOUSE", "TOWN_HOME", "NHA_PHO" -> "TOWNHOUSE";
            case "COTTAGE" -> "COTTAGE";
            case "BUNGALOW" -> "BUNGALOW";
            default -> null;
        };
    }

    private String normalizeRoomType(String value) {
        String normalized = normalizeEnumCandidate(value);
        if (normalized == null) {
            return null;
        }

        if (normalized.contains("PRIVATE") || normalized.contains("PHONG_RIENG") || normalized.equals("RIENG")) {
            return "PRIVATE_ROOM";
        }
        if (normalized.contains("SHARED") || normalized.contains("PHONG_CHUNG") || normalized.equals("CHUNG")) {
            return "SHARED_ROOM";
        }
        if (normalized.contains("ENTIRE") || normalized.contains("WHOLE") || normalized.contains("NGUYEN_CAN")) {
            return "ENTIRE_PLACE";
        }

        return switch (normalized) {
            case "PRIVATE_ROOM" -> "PRIVATE_ROOM";
            case "SHARED_ROOM" -> "SHARED_ROOM";
            case "ENTIRE_PLACE" -> "ENTIRE_PLACE";
            default -> null;
        };
    }

    private String normalizeSortBy(String value) {
        String normalized = normalizeEnumCandidate(value);
        if (normalized == null) {
            return "RELEVANCE";
        }

        return switch (normalized) {
            case "PRICE_ASC", "LOWEST_PRICE", "CHEAPEST", "RE_NHAT", "GIA_THAP_NHAT" -> "PRICE_ASC";
            case "PRICE_DESC", "HIGHEST_PRICE", "MOST_EXPENSIVE", "DAT_NHAT", "GIA_CAO_NHAT" -> "PRICE_DESC";
            case "CREATED_DESC", "NEWEST", "MOI_NHAT" -> "CREATED_DESC";
            case "CREATED_ASC", "OLDEST", "CU_NHAT" -> "CREATED_ASC";
            case "GUESTS_DESC", "MANY_GUESTS" -> "GUESTS_DESC";
            case "RELEVANCE" -> "RELEVANCE";
            default -> "RELEVANCE";
        };
    }

    private String normalizeEnumCandidate(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return normalizeSearchText(value)
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace('-', '_')
                .replaceAll("\\s+", "_");
    }

    private String normalizeSearchText(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('\u0111', 'd')
                .replace('\u0110', 'D');

        return normalized.toLowerCase(Locale.ROOT);
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

    private String formatResults(List<ListingResponse> listings) {
        StringBuilder builder = new StringBuilder();
        builder.append("LISTINGS_FOUND: ").append(listings.size()).append(" result(s).\n");
        builder.append("Use these real listing records. Do not invent missing fields.\n\n");

        for (int index = 0; index < listings.size(); index++) {
            ListingResponse listing = listings.get(index);

            builder.append(index + 1).append(". ")
                    .append(nullToDash(listing.title()))
                    .append("\n");
            appendLine(builder, "listingId", listing.listingId());
            appendLine(builder, "title", listing.title());
            appendLine(builder, "description", listing.description());
            appendLine(builder, "propertyType", listing.propertyType());
            appendLine(builder, "roomType", listing.roomType());
            appendLine(builder, "numBedrooms", listing.numBedrooms());
            appendLine(builder, "numBeds", listing.numBeds());
            appendLine(builder, "numBathrooms", listing.numBathrooms());
            appendLine(builder, "maxGuests", listing.maxGuests());
            appendLine(builder, "address", listing.address());
            appendLine(builder, "city", listing.city());
            appendLine(builder, "state", listing.state());
            appendLine(builder, "country", listing.country());
            appendLine(builder, "postalCode", listing.postalCode());
            appendLine(builder, "latitude", listing.latitude());
            appendLine(builder, "longitude", listing.longitude());
            appendLine(builder, "status", listing.status());
            appendLine(builder, "instantBook", listing.instantBook());
            appendLine(builder, "checkInStartTime", listing.checkInStartTime());
            appendLine(builder, "checkInEndTime", listing.checkInEndTime());
            appendLine(builder, "checkOutTime", listing.checkOutTime());
            appendLine(builder, "cancellationPolicyCode", listing.cancellationPolicyCode());
            appendLine(builder, "suspendedUntil", listing.suspendedUntil());
            appendLine(builder, "suspensionReason", listing.suspensionReason());
            appendLine(builder, "createdAt", listing.createdAt());
            appendLine(builder, "updatedAt", listing.updatedAt());
            appendLine(builder, "coverPhoto", coverPhoto(listing));
            appendPricing(builder, listing.pricing());
            appendAmenities(builder, listing.amenities());
            appendHouseRules(builder, listing.houseRules());
            appendPhotos(builder, listing.photos());
            appendAccessInfoSummary(builder, listing.accessInfo());
        }

        return builder.toString();
    }

    private void appendLine(StringBuilder builder, String label, Object value) {
        builder.append("   - ")
                .append(label)
                .append(": ")
                .append(nullToDash(value))
                .append("\n");
    }

    private void appendPricing(StringBuilder builder, ListingPricingResponse pricing) {
        builder.append("   - pricing:\n");
        if (pricing == null) {
            builder.append("     + none\n");
            return;
        }

        appendNestedLine(builder, "pricingId", pricing.pricingId());
        appendNestedLine(builder, "listingId", pricing.listingId());
        appendNestedLine(builder, "basePrice", pricing.basePrice());
        appendNestedLine(builder, "currency", pricing.currency());
        appendNestedLine(builder, "cleaningFee", pricing.cleaningFee());
        appendNestedLine(builder, "serviceFeePercentage", pricing.serviceFeePercentage());
        appendNestedLine(builder, "weekendPrice", pricing.weekendPrice());
        appendNestedLine(builder, "weeklyDiscount", pricing.weeklyDiscount());
        appendNestedLine(builder, "monthlyDiscount", pricing.monthlyDiscount());
        appendNestedLine(builder, "createdAt", pricing.createdAt());
        appendNestedLine(builder, "updatedAt", pricing.updatedAt());
    }

    private void appendAmenities(StringBuilder builder, List<AmenityResponse> amenities) {
        builder.append("   - amenities:\n");
        if (amenities == null || amenities.isEmpty()) {
            builder.append("     + none\n");
            return;
        }

        for (AmenityResponse amenity : amenities) {
            if (amenity == null) {
                continue;
            }

            builder.append("     + amenityId=")
                    .append(nullToDash(amenity.amenityId()))
                    .append(" | name=")
                    .append(nullToDash(amenity.name()))
                    .append(" | category=")
                    .append(nullToDash(amenity.category()))
                    .append(" | iconUrl=")
                    .append(nullToDash(amenity.iconUrl()))
                    .append(" | createdAt=")
                    .append(nullToDash(amenity.createdAt()))
                    .append("\n");
        }
    }

    private void appendHouseRules(StringBuilder builder, HouseRulesResponse houseRules) {
        builder.append("   - houseRules:\n");
        if (houseRules == null) {
            builder.append("     + none\n");
            return;
        }

        appendNestedLine(builder, "ruleId", houseRules.ruleId());
        appendNestedLine(builder, "listingId", houseRules.listingId());
        appendNestedLine(builder, "checkInFrom", houseRules.checkInFrom());
        appendNestedLine(builder, "checkInTo", houseRules.checkInTo());
        appendNestedLine(builder, "checkOutTime", houseRules.checkOutTime());
        appendNestedLine(builder, "smokingAllowed", houseRules.smokingAllowed());
        appendNestedLine(builder, "petsAllowed", houseRules.petsAllowed());
        appendNestedLine(builder, "partiesAllowed", houseRules.partiesAllowed());
        appendNestedLine(builder, "childrenAllowed", houseRules.childrenAllowed());
        appendNestedLine(builder, "additionalRules", houseRules.additionalRules());
        appendNestedLine(builder, "createdAt", houseRules.createdAt());
        appendNestedLine(builder, "updatedAt", houseRules.updatedAt());
    }

    private void appendPhotos(StringBuilder builder, List<ListingPhotoResponse> photos) {
        builder.append("   - photos:\n");
        if (photos == null || photos.isEmpty()) {
            builder.append("     + none\n");
            return;
        }

        for (ListingPhotoResponse photo : photos) {
            if (photo == null) {
                continue;
            }

            builder.append("     + photoId=")
                    .append(nullToDash(photo.photoId()))
                    .append(" | listingId=")
                    .append(nullToDash(photo.listingId()))
                    .append(" | photoUrl=")
                    .append(nullToDash(photo.photoUrl()))
                    .append(" | caption=")
                    .append(nullToDash(photo.caption()))
                    .append(" | displayOrder=")
                    .append(nullToDash(photo.displayOrder()))
                    .append(" | isCover=")
                    .append(nullToDash(photo.isCover()))
                    .append(" | uploadedAt=")
                    .append(nullToDash(photo.uploadedAt()))
                    .append("\n");
        }
    }

    private void appendAccessInfoSummary(StringBuilder builder, ListingAccessInfoResponse accessInfo) {
        builder.append("   - accessInfo:\n");
        if (accessInfo == null) {
            builder.append("     + none\n");
            return;
        }

        appendNestedLine(builder, "accessInfoId", accessInfo.accessInfoId());
        appendNestedLine(builder, "listingId", accessInfo.listingId());
        builder.append("     + wifiPassword: hidden_post_booking_secret\n");
        builder.append("     + entryCode: hidden_post_booking_secret\n");
        builder.append("     + smartLockInstructions: hidden_post_booking_secret\n");
        builder.append("     + keyPickupInstructions: hidden_post_booking_secret\n");
        builder.append("     + checkInGuide: hidden_post_booking_secret\n");
    }

    private void appendNestedLine(StringBuilder builder, String label, Object value) {
        builder.append("     + ")
                .append(label)
                .append("=")
                .append(nullToDash(value))
                .append("\n");
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
            String sortBy
    ) {
    }
}
