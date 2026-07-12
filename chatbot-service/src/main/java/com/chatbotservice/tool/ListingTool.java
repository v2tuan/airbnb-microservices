package com.chatbotservice.tool;

import com.chatbotservice.client.ListingFeignClient;
import com.chatbotservice.configuration.ChatbotProperties;
import com.chatbotservice.context.ConversationListingContextStore;
import com.chatbotservice.context.ListingResolveResult;
import com.chatbotservice.context.ListingSearchSnapshot;
import com.chatbotservice.context.ListingSnapshot;
import com.chatbotservice.context.SearchCriteriaSnapshot;
import com.chatbotservice.dto.listing.AmenityResponse;
import com.chatbotservice.dto.listing.ApiResponse;
import com.chatbotservice.dto.listing.DailyAvailabilityResponse;
import com.chatbotservice.dto.listing.HouseRulesResponse;
import com.chatbotservice.dto.listing.ListingAccessInfoResponse;
import com.chatbotservice.dto.listing.ListingAvailabilityResponse;
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
import java.util.UUID;

@Component
@Slf4j
public class ListingTool {
    private static final String LISTING_CARDS_CONTEXT_KEY = "listingCards";
    private static final String CONVERSATION_ID_CONTEXT_KEY = "conversationId";
    private static final String USER_ID_CONTEXT_KEY = "userId";

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
                    Put place names in city, state, or country. Do not put city/province/country names in keyword.
                    """
    )
    public String searchListings(
            @ToolParam(required = false, description = "Free text keyword for listing features, for example lake view, balcony, quiet, center. Do not include city, province, or country here.")
            String keyword,
            @ToolParam(required = false, description = "City name from the user's location request, for example Hanoi, Da Nang, Da lat, Ho Chi Minh.")
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
                sortBy
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
            String normalizedKeyword = normalizeNullable(filters.keyword());
            SearchLocation normalizedLocation = normalizeSearchLocation(
                    filters.city(),
                    filters.state(),
                    filters.country()
            );

            log.info(
                    "Normalized listing search request - keyword={}, city={}, state={}, country={}",
                    normalizedKeyword,
                    normalizedLocation.city(),
                    normalizedLocation.state(),
                    normalizedLocation.country()
            );

            ApiResponse<List<ListingResponse>> response = listingFeignClient.searchListingsWithFilters(
                    new ListingFilterRequest(
                            normalizedKeyword,
                            normalizedLocation.city(),
                            normalizedLocation.state(),
                            normalizedLocation.country(),
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
            saveSearchSnapshot(toolContext, listings, filters);

            return formatResults(listings);
        } catch (Exception exception) {
            log.warn("Listing tool failed", exception);
            return "LISTING_SERVICE_ERROR: listing-service is currently unavailable or timed out.";
        }
    }

    @Tool(
            name = "check_listing_availability",
            description = """
                    Check whether a real listing is bookable for a specific date or date range.
                    Use this when the user asks if a room/listing is available, free, bookable,
                    or still open on a date. Prefer listingId when it is available from previous
                    tool results. Otherwise pass listingTitle with the room name, title, or a
                    distinctive phrase from the conversation. Do not invent listingId values.
                    If the tool returns NEED_LISTING_SELECTION, ask the user to confirm which
                    listing they mean before checking availability again.
                    If the user asks about one date only, use checkIn as that date and omit checkOut.
                    """
    )
    public String checkListingAvailability(
            @ToolParam(required = false, description = "Exact listingId UUID from a previous search_listings result or explicit user selection.")
            String listingId,
            @ToolParam(required = false, description = "Listing title, room name, or distinctive phrase when the user refers to a room without listingId.")
            String listingTitle,
            @ToolParam(description = "Check-in date in ISO format yyyy-MM-dd. For a one-day question, use the date the user asked about.")
            LocalDate checkIn,
            @ToolParam(required = false, description = "Check-out date in ISO format yyyy-MM-dd. If the user asks for one date only, leave this empty.")
            LocalDate checkOut,
            ToolContext toolContext
    ) {
        log.info(
                "Checking listing availability - listingId={}, listingTitle={}, checkIn={}, checkOut={}",
                listingId,
                listingTitle,
                checkIn,
                checkOut
        );

        ListingReference listingReference = resolveListingReference(toolContext, listingId, listingTitle);
        if (!listingReference.resolved()) {
            return listingReference.message();
        }

        if (checkIn == null) {
            return "MISSING_DATE: checkIn is required. Ask the user which date they want to check.";
        }

        LocalDate normalizedCheckOut = normalizeCheckOut(checkIn, checkOut);
        if (!normalizedCheckOut.isAfter(checkIn)) {
            return "INVALID_DATE_RANGE: checkOut must be after checkIn.";
        }

        try {
            ApiResponse<ListingAvailabilityResponse> response = listingFeignClient.checkBookableAvailability(
                    listingReference.listingId(),
                    checkIn,
                    normalizedCheckOut
            );
            ListingAvailabilityResponse availability = response != null ? response.data() : null;

            if (availability == null) {
                return "AVAILABILITY_SERVICE_ERROR: listing-service did not return availability data.";
            }

            String checkResponse = formatAvailabilityResult(availability);
            log.info("Availability tool response: {}", checkResponse);
            return checkResponse;
        } catch (Exception exception) {
            log.warn("Availability tool failed", exception);
            return "AVAILABILITY_SERVICE_ERROR: listing-service is currently unavailable or timed out.";
        }
    }

    private List<ListingResponse> safeData(ApiResponse<List<ListingResponse>> response) {
        return response != null && response.data() != null
                ? response.data()
                : List.of();
    }

    private void saveSearchSnapshot(
            ToolContext toolContext,
            List<ListingResponse> listings,
            SearchFilters filters
    ) {
        ToolConversationScope scope = toolConversationScope(toolContext);
        if (scope == null || listings == null || listings.isEmpty()) {
            return;
        }

        // Context này là dữ liệu có cấu trúc cho backend resolve các câu hỏi tiếp theo.
        // Nó không thay thế ChatMemory của Spring AI, mà chỉ giúp tool không phải đoán listingId.
        List<ListingSnapshot> listingSnapshots = listings.stream()
                .map(this::toListingSnapshot)
                .filter(Objects::nonNull)
                .toList();

        if (listingSnapshots.isEmpty()) {
            return;
        }

        ListingSearchSnapshot snapshot = new ListingSearchSnapshot(
                UUID.randomUUID().toString(),
                toSearchCriteriaSnapshot(filters),
                listingSnapshots,
                Instant.now()
        );

        listingContextStore.saveSearch(scope.userId(), scope.conversationId(), snapshot);
    }

    private ListingSnapshot toListingSnapshot(ListingResponse listing) {
        if (listing == null || listing.listingId() == null) {
            return null;
        }

        ListingPricingResponse pricing = listing.pricing();

        return new ListingSnapshot(
                listing.listingId(),
                listing.title(),
                listing.city(),
                listing.country(),
                pricing != null ? pricing.basePrice() : null,
                pricing != null ? pricing.currency() : null,
                listing.maxGuests(),
                listing.roomType(),
                listing.propertyType()
        );
    }

    private SearchCriteriaSnapshot toSearchCriteriaSnapshot(SearchFilters filters) {
        return new SearchCriteriaSnapshot(
                filters.keyword(),
                filters.city(),
                filters.state(),
                filters.country(),
                filters.guests(),
                filters.minPrice(),
                filters.maxPrice(),
                filters.amenityNames(),
                filters.checkIn(),
                filters.checkOut(),
                filters.sortBy()
        );
    }

    private UUID parseListingId(String listingId) {
        if (!StringUtils.hasText(listingId)) {
            return null;
        }

        try {
            return UUID.fromString(listingId.trim());
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private LocalDate normalizeCheckOut(LocalDate checkIn, LocalDate checkOut) {
        if (checkOut == null || checkOut.isEqual(checkIn)) {
            return checkIn.plusDays(1);
        }

        return checkOut;
    }

    private ListingReference resolveListingReference(
            ToolContext toolContext,
            String listingId,
            String listingTitle
    ) {
        UUID parsedListingId = parseListingId(listingId);
        String effectiveListingTitle = StringUtils.hasText(listingTitle) ? listingTitle : listingId;
        ToolConversationScope scope = toolConversationScope(toolContext);

        if (parsedListingId != null) {
            String title = scope != null
                    ? listingContextStore.findListingById(scope.userId(), scope.conversationId(), parsedListingId)
                    .map(ListingSnapshot::title)
                    .orElse(null)
                    : null;

            return ListingReference.resolved(parsedListingId, title);
        }

        if (scope == null) {
            return ListingReference.unresolved(
                    "NEED_LISTING_SELECTION: No conversation listing context is available. Ask the user to choose or search for a listing first."
            );
        }

        ListingResolveResult resolveResult = listingContextStore.resolveListing(
                scope.userId(),
                scope.conversationId(),
                effectiveListingTitle
        );

        return switch (resolveResult.status()) {
            case FOUND -> ListingReference.resolved(
                    resolveResult.listing().listingId(),
                    resolveResult.listing().title()
            );
            case NO_CONTEXT -> ListingReference.unresolved(
                    "NEED_LISTING_SELECTION: No previous search result is available. Ask the user to search listings first."
            );
            case NOT_FOUND -> ListingReference.unresolved(
                    "NEED_LISTING_SELECTION: Could not find that listing in previous search results.\n"
                            + formatListingOptions(resolveResult.candidates())
            );
            case AMBIGUOUS -> ListingReference.unresolved(
                    "NEED_LISTING_SELECTION: The listing reference is ambiguous. Ask the user to choose one of these options.\n"
                            + formatListingOptions(resolveResult.candidates())
            );
        };
    }

    private ToolConversationScope toolConversationScope(ToolContext toolContext) {
        if (toolContext == null || toolContext.getContext() == null) {
            return null;
        }

        String userId = contextString(toolContext, USER_ID_CONTEXT_KEY);
        String conversationId = contextString(toolContext, CONVERSATION_ID_CONTEXT_KEY);
        if (!StringUtils.hasText(userId) || !StringUtils.hasText(conversationId)) {
            return null;
        }

        return new ToolConversationScope(userId, conversationId);
    }

    private String contextString(ToolContext toolContext, String key) {
        Object value = toolContext.getContext().get(key);
        return value instanceof String text && StringUtils.hasText(text) ? text : null;
    }

    private String formatListingOptions(List<ListingSnapshot> listings) {
        if (listings == null || listings.isEmpty()) {
            return "Available options: none.";
        }

        StringBuilder builder = new StringBuilder("Available options from previous searches:\n");
        for (ListingSnapshot listing : listings) {
            builder.append("- listingId=")
                    .append(listing.listingId())
                    .append(" | title=")
                    .append(nullToDash(listing.title()))
                    .append(" | city=")
                    .append(nullToDash(listing.city()))
                    .append(" | basePrice=")
                    .append(nullToDash(listing.basePrice()))
                    .append(" | currency=")
                    .append(nullToDash(listing.currency()))
                    .append(" | maxGuests=")
                    .append(nullToDash(listing.maxGuests()))
                    .append(" | roomType=")
                    .append(nullToDash(listing.roomType()))
                    .append(" | propertyType=")
                    .append(nullToDash(listing.propertyType()))
                    .append("\n");
        }

        return builder.toString();
    }

    private String formatAvailabilityResult(ListingAvailabilityResponse availability) {
        StringBuilder builder = new StringBuilder();
        builder.append("LISTING_AVAILABILITY_CHECKED\n");
        appendLine(builder, "listingId", availability.listingId());
        appendLine(builder, "checkIn", availability.checkIn());
        appendLine(builder, "checkOut", availability.checkOut());
        appendLine(builder, "nights", availability.nights());
        appendLine(builder, "available", availability.available());
        appendAvailabilityReasons(builder, availability.reasons());
        appendDateList(builder, "availableDates", availability.availableDates());
        appendDateList(builder, "unavailableDates", availability.unavailableDates());
        appendDailyAvailability(builder, availability.dailyAvailability());
        appendLine(builder, "serviceMessage", availability.message());
        builder.append("Use this verified backend result. Do not override the availability decision.\n");
        builder.append("When answering, explain both full-range availability and which stay dates are available/unavailable.\n");
        return builder.toString();
    }

    private void appendDateList(StringBuilder builder, String label, List<LocalDate> dates) {
        builder.append("   - ")
                .append(label)
                .append(": ");

        if (dates == null || dates.isEmpty()) {
            builder.append("none\n");
            return;
        }

        builder.append(dates.stream().map(LocalDate::toString).collect(java.util.stream.Collectors.joining(", ")))
                .append("\n");
    }

    private void appendDailyAvailability(StringBuilder builder, List<DailyAvailabilityResponse> days) {
        builder.append("   - dailyAvailability:\n");
        if (days == null || days.isEmpty()) {
            builder.append("     + none\n");
            return;
        }

        for (DailyAvailabilityResponse day : days) {
            if (day == null) {
                continue;
            }

            builder.append("     + date=")
                    .append(nullToDash(day.date()))
                    .append(" | available=")
                    .append(nullToDash(day.available()))
                    .append(" | reasons=");

            if (day.reasons() == null || day.reasons().isEmpty()) {
                builder.append("none");
            } else {
                builder.append(String.join(", ", day.reasons()));
            }

            builder.append("\n");
        }
    }

    private void appendAvailabilityReasons(StringBuilder builder, List<String> reasons) {
        builder.append("   - reasons:\n");
        if (reasons == null || reasons.isEmpty()) {
            builder.append("     + none\n");
            return;
        }

        for (String reason : reasons) {
            builder.append("     + ")
                    .append(reason)
                    .append(" | ")
                    .append(explainAvailabilityReason(reason))
                    .append("\n");
        }
    }

    private String explainAvailabilityReason(String reason) {
        if (reason == null) {
            return "Unknown reason.";
        }

        return switch (reason) {
            case "INVALID_DATE_RANGE" -> "Check-out date must be after check-in date.";
            case "PAST_DATE_RANGE" -> "Check-in date is in the past.";
            case "PAST_DATE" -> "This stay date is in the past.";
            case "LISTING_NOT_ACTIVE" -> "Listing is not active.";
            case "LISTING_SUSPENDED" -> "Listing is suspended.";
            case "HOST_BLOCKED_DATE" -> "Host blocked at least one stay date.";
            case "MIN_NIGHTS_NOT_MET" -> "Selected stay is shorter than the minimum night rule.";
            case "MAX_NIGHTS_EXCEEDED" -> "Selected stay is longer than the maximum night rule.";
            case "BOOKING_CONFLICT" -> "There is an active overlapping booking.";
            case "BOOKING_SERVICE_UNAVAILABLE" -> "Booking-service could not verify booking conflicts.";
            case "PARTIALLY_AVAILABLE" -> "Only some stay dates are available.";
            case "NO_DATES_AVAILABLE" -> "No stay dates are available in this range.";
            default -> "Backend reported this availability reason.";
        };
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
            String sortBy
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
    }

    private List<String> singleValueList(String value) {
        return StringUtils.hasText(value) ? List.of(value) : null;
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

    private SearchLocation normalizeSearchLocation(String city, String state, String country) {
        return new SearchLocation(
                normalizeLocationField(city, LocationField.CITY),
                normalizeLocationField(state, LocationField.STATE),
                normalizeLocationField(country, LocationField.COUNTRY)
        );
    }

    private String normalizeLocationField(String value, LocationField field) {
        String normalized = normalizeLocalitySearchText(value);
        if (!StringUtils.hasText(normalized)) {
            return null;
        }

        // Một vài địa danh trong dữ liệu đang dùng tên phổ biến bằng tiếng Anh.
        String alias = switch (field) {
            case CITY -> normalizeCityAlias(normalized);
            case COUNTRY -> normalizeCountryAlias(normalized);
            case STATE -> null;
        };

        return alias != null ? alias : toTitleCaseAscii(normalized);
    }

    private String normalizeCityAlias(String normalized) {
        return switch (normalized) {
            case "ha noi", "hanoi" -> "Hanoi";
            case "da nang", "danang" -> "Da Nang";
            case "da lat", "dalat" -> "Dalat";
            case "ho chi minh", "ho chi minh city", "hcm", "tp hcm", "tp ho chi minh", "sai gon", "saigon" -> "Ho Chi Minh";
            default -> null;
        };
    }

    private String normalizeCountryAlias(String normalized) {
        return switch (normalized) {
            case "viet nam", "vietnam" -> "Vietnam";
            default -> null;
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

    private String normalizeLocalitySearchText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return normalizeSearchText(value)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }

    private String toTitleCaseAscii(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        String[] words = value.trim().split("\\s+");
        StringBuilder builder = new StringBuilder();
        for (String word : words) {
            if (builder.length() > 0) {
                builder.append(' ');
            }
            builder.append(Character.toUpperCase(word.charAt(0)));
            if (word.length() > 1) {
                builder.append(word.substring(1));
            }
        }
        return builder.toString();
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

    private record SearchLocation(String city, String state, String country) {
    }

    private enum LocationField {
        CITY,
        STATE,
        COUNTRY
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

    private record ToolConversationScope(String userId, String conversationId) {
    }

    private record ListingReference(UUID listingId, String title, String message) {
        static ListingReference resolved(UUID listingId, String title) {
            return new ListingReference(listingId, title, null);
        }

        static ListingReference unresolved(String message) {
            return new ListingReference(null, null, message);
        }

        boolean resolved() {
            return listingId != null;
        }
    }
}
