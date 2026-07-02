package com.chatbotservice.tool;

import com.chatbotservice.client.ListingFeignClient;
import com.chatbotservice.context.ConversationListingContextStore;
import com.chatbotservice.context.ListingResolveResult;
import com.chatbotservice.context.ListingSnapshot;
import com.chatbotservice.dto.booking.BookingConfirmationResponse;
import com.chatbotservice.dto.listing.ApiResponse;
import com.chatbotservice.dto.listing.ListingAvailabilityResponse;
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
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Component
@Slf4j
public class BookingTool {
    private static final String BOOKING_CONFIRMATIONS_CONTEXT_KEY = "bookingConfirmations";
    private static final String CONVERSATION_ID_CONTEXT_KEY = "conversationId";
    private static final String USER_ID_CONTEXT_KEY = "userId";
    private static final String DEFAULT_CURRENCY = "VND";
    private static final String DEFAULT_CANCELLATION_POLICY_CODE = "FLEXIBLE";

    private final ListingFeignClient listingFeignClient;
    private final ConversationListingContextStore listingContextStore;

    public BookingTool(
            ListingFeignClient listingFeignClient,
            ConversationListingContextStore listingContextStore
    ) {
        this.listingFeignClient = listingFeignClient;
        this.listingContextStore = listingContextStore;
    }

    @Tool(
            name = "prepare_booking",
            description = """
                    Prepare a booking confirmation for a real listing before payment.
                    Use this when the user wants to book, reserve, checkout, or pay for a listing.
                    This tool only validates the requested booking details and sends a confirmation payload to the UI.
                    It must not create a booking, must not create a Stripe PaymentIntent, and must not confirm payment.
                    Prefer listingId from previous search results. If the user refers to a room by name or description,
                    pass listingTitle so the tool can resolve it from previous listing search context.
                    """
    )
    public String prepareBooking(
            @ToolParam(required = false, description = "Exact listingId UUID from a previous search result or explicit user input.")
            String listingId,
            @ToolParam(required = false, description = "Listing title, room name, or distinctive phrase when user refers to a listing without UUID.")
            String listingTitle,
            @ToolParam(required = false, description = "Check-in date in ISO format yyyy-MM-dd.")
            LocalDate checkInDate,
            @ToolParam(required = false, description = "Check-out date in ISO format yyyy-MM-dd.")
            LocalDate checkOutDate,
            @ToolParam(required = false, description = "Number of adults. Ask the user if missing.")
            Integer numberOfAdults,
            @ToolParam(required = false, description = "Number of children, default 0 if user does not mention children.")
            Integer numberOfChildren,
            @ToolParam(required = false, description = "Number of infants, default 0 if user does not mention infants.")
            Integer numberOfInfants,
            @ToolParam(required = false, description = "Number of pets, default 0 if user does not mention pets.")
            Integer numberOfPets,
            @ToolParam(required = false, description = "Currency code such as VND, USD, or EUR. Prefer listing currency when omitted.")
            String currency,
            @ToolParam(required = false, description = "Optional note from guest to host.")
            String guestNotes,
            ToolContext toolContext
    ) {
        log.info(
                "Preparing booking confirmation listingId={}, listingTitle={}, checkIn={}, checkOut={}, adults={}",
                listingId,
                listingTitle,
                checkInDate,
                checkOutDate,
                numberOfAdults
        );

        ListingReference listingReference = resolveListingReference(toolContext, listingId, listingTitle);
        if (!listingReference.resolved()) {
            return listingReference.message();
        }

        String missingDetails = missingBookingDetails(checkInDate, checkOutDate, numberOfAdults);
        if (missingDetails != null) {
            return missingDetails;
        }

        if (!checkOutDate.isAfter(checkInDate)) {
            return "INVALID_BOOKING_DATES: Check-out date must be after check-in date. Ask the user to choose a valid date range.";
        }

        if (checkInDate.isBefore(LocalDate.now())) {
            return "INVALID_BOOKING_DATES: Check-in date is in the past. Ask the user to choose a future date.";
        }

        try {
            ListingResponse listing = getListing(listingReference.listingId());
            if (listing == null) {
                return "NEED_LISTING_SELECTION: Could not load that listing. Ask the user to choose another listing.";
            }

            String validationError = validateListingForBooking(
                    listing,
                    numberOfAdults,
                    numberOfChildren,
                    numberOfPets
            );
            if (validationError != null) {
                return validationError;
            }

            ListingAvailabilityResponse availability = checkAvailability(listing.listingId(), checkInDate, checkOutDate);
            if (availability == null || !Boolean.TRUE.equals(availability.available())) {
                return formatUnavailableMessage(availability);
            }

            BookingConfirmationResponse confirmation = toBookingConfirmation(
                    listing,
                    checkInDate,
                    checkOutDate,
                    numberOfAdults,
                    safeCount(numberOfChildren),
                    safeCount(numberOfInfants),
                    safeCount(numberOfPets),
                    currency,
                    guestNotes
            );
            addBookingConfirmationToContext(toolContext, confirmation);

            return """
                    BOOKING_CONFIRMATION_READY:
                    - Listing: %s
                    - Check-in: %s
                    - Check-out: %s
                    - Guests: %d adults, %d children, %d infants, %d pets
                    - Estimated total: %d %s

                    Tell the user to review the booking confirmation card below.
                    Do not say the booking has been created.
                    Do not say payment has started.
                    """.formatted(
                    confirmation.title(),
                    confirmation.checkInDate(),
                    confirmation.checkOutDate(),
                    confirmation.numberOfAdults(),
                    confirmation.numberOfChildren(),
                    confirmation.numberOfInfants(),
                    confirmation.numberOfPets(),
                    confirmation.estimatedTotalAmount(),
                    confirmation.currency()
            );
        } catch (Exception exception) {
            log.warn("Prepare booking tool failed", exception);
            return "BOOKING_PREPARATION_ERROR: Could not prepare booking confirmation because an internal service is unavailable. Ask the user to try again later.";
        }
    }

    private String missingBookingDetails(LocalDate checkInDate, LocalDate checkOutDate, Integer numberOfAdults) {
        if (checkInDate == null || checkOutDate == null) {
            return "NEED_BOOKING_DETAILS: Ask the user for both check-in and check-out dates before showing booking confirmation.";
        }

        if (numberOfAdults == null || numberOfAdults < 1) {
            return "NEED_BOOKING_DETAILS: Ask the user how many adults will stay before showing booking confirmation.";
        }

        return null;
    }

    private ListingResponse getListing(UUID listingId) {
        ApiResponse<ListingResponse> response = listingFeignClient.getListingById(listingId);
        return response != null ? response.data() : null;
    }

    private ListingAvailabilityResponse checkAvailability(UUID listingId, LocalDate checkInDate, LocalDate checkOutDate) {
        ApiResponse<ListingAvailabilityResponse> response = listingFeignClient.checkBookableAvailability(
                listingId,
                checkInDate,
                checkOutDate
        );
        return response != null ? response.data() : null;
    }

    private String validateListingForBooking(
            ListingResponse listing,
            Integer numberOfAdults,
            Integer numberOfChildren,
            Integer numberOfPets
    ) {
        if (!"ACTIVE".equalsIgnoreCase(nullToEmpty(listing.status()))) {
            return "BOOKING_UNAVAILABLE: This listing is not active. Ask the user to choose another listing.";
        }

        if (listing.pricing() == null || listing.pricing().basePrice() == null) {
            return "BOOKING_UNAVAILABLE: This listing has no configured pricing. Ask the user to choose another listing.";
        }

        int stayingGuests = adultCount(numberOfAdults) + safeCount(numberOfChildren);
        if (listing.maxGuests() != null && stayingGuests > listing.maxGuests()) {
            return "BOOKING_UNAVAILABLE: Guest count exceeds this listing capacity. Ask the user to reduce guests or choose another listing.";
        }

        int pets = safeCount(numberOfPets);
        boolean petsAllowed = listing.houseRules() != null && Boolean.TRUE.equals(listing.houseRules().petsAllowed());
        if (pets > 0 && !petsAllowed) {
            return "BOOKING_UNAVAILABLE: Pets are not allowed for this listing. Ask whether the user wants to continue without pets or choose another listing.";
        }

        return null;
    }

    private String formatUnavailableMessage(ListingAvailabilityResponse availability) {
        if (availability == null) {
            return "BOOKING_UNAVAILABLE: Availability could not be verified. Ask the user to try again later.";
        }

        String unavailableDates = availability.unavailableDates() == null || availability.unavailableDates().isEmpty()
                ? ""
                : " Unavailable dates: " + availability.unavailableDates();
        String reasons = availability.reasons() == null || availability.reasons().isEmpty()
                ? ""
                : " Reasons: " + String.join(", ", availability.reasons());

        return "BOOKING_UNAVAILABLE: The listing is not bookable for the requested range." + unavailableDates + reasons;
    }

    private BookingConfirmationResponse toBookingConfirmation(
            ListingResponse listing,
            LocalDate checkInDate,
            LocalDate checkOutDate,
            Integer numberOfAdults,
            Integer numberOfChildren,
            Integer numberOfInfants,
            Integer numberOfPets,
            String requestedCurrency,
            String guestNotes
    ) {
        long totalNights = ChronoUnit.DAYS.between(checkInDate, checkOutDate);
        ListingPricingResponse pricing = listing.pricing();
        BigDecimal nightlyPrice = money(pricing.basePrice());
        BigDecimal accommodationSubtotal = money(nightlyPrice.multiply(BigDecimal.valueOf(totalNights)));
        BigDecimal cleaningFee = money(pricing.cleaningFee());
        BigDecimal serviceFeePercentage = pricing.serviceFeePercentage() != null
                ? pricing.serviceFeePercentage()
                : BigDecimal.ZERO;
        BigDecimal serviceFee = money(accommodationSubtotal
                .multiply(serviceFeePercentage)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
        BigDecimal taxes = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = money(accommodationSubtotal.add(cleaningFee).add(serviceFee).add(taxes));
        String currency = resolveCurrency(listing, requestedCurrency);

        return new BookingConfirmationResponse(
                listing.listingId().toString(),
                listing.title(),
                coverPhoto(listing.photos()),
                location(listing),
                listing.city(),
                listing.country(),
                listing.maxGuests(),
                listing.roomType(),
                listing.propertyType(),
                checkInDate,
                checkOutDate,
                totalNights,
                adultCount(numberOfAdults),
                safeCount(numberOfChildren),
                safeCount(numberOfInfants),
                safeCount(numberOfPets),
                StringUtils.hasText(guestNotes) ? guestNotes.trim() : null,
                currency,
                nightlyPrice,
                accommodationSubtotal,
                cleaningFee,
                serviceFee,
                taxes,
                totalAmount.setScale(0, RoundingMode.HALF_UP).longValue(),
                cancellationPolicyCode(listing)
        );
    }

    @SuppressWarnings("unchecked")
    private void addBookingConfirmationToContext(ToolContext toolContext, BookingConfirmationResponse confirmation) {
        if (toolContext == null || toolContext.getContext() == null || confirmation == null) {
            return;
        }

        Object value = toolContext.getContext().get(BOOKING_CONFIRMATIONS_CONTEXT_KEY);
        if (!(value instanceof List<?> confirmations)) {
            return;
        }

        // ToolContext chi song trong request hien tai; frontend se nhan payload qua SSE event rieng.
        List<BookingConfirmationResponse> typedConfirmations = (List<BookingConfirmationResponse>) confirmations;
        typedConfirmations.add(confirmation);
    }

    private ListingReference resolveListingReference(
            ToolContext toolContext,
            String listingId,
            String listingTitle
    ) {
        UUID parsedListingId = parseListingId(listingId);
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
                    "NEED_LISTING_SELECTION: No conversation listing context is available. Ask the user to search or choose a listing first."
            );
        }

        ListingResolveResult resolveResult = listingContextStore.resolveListing(
                scope.userId(),
                scope.conversationId(),
                StringUtils.hasText(listingTitle) ? listingTitle : null
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
                    "NEED_LISTING_SELECTION: Multiple listings match. Ask the user to confirm which listing they want.\n"
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

    private String formatListingOptions(List<ListingSnapshot> listings) {
        if (listings == null || listings.isEmpty()) {
            return "No candidate listings are available.";
        }

        return listings.stream()
                .limit(5)
                .map(listing -> "- %s | %s, %s | %s %s/đêm".formatted(
                        listing.title(),
                        nullToEmpty(listing.city()),
                        nullToEmpty(listing.country()),
                        listing.basePrice() != null ? listing.basePrice().toPlainString() : "?",
                        StringUtils.hasText(listing.currency()) ? listing.currency() : DEFAULT_CURRENCY
                ))
                .toList()
                .toString();
    }

    private BigDecimal money(BigDecimal value) {
        return (value != null ? value : BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    private String resolveCurrency(ListingResponse listing, String requestedCurrency) {
        if (StringUtils.hasText(requestedCurrency)) {
            return requestedCurrency.trim().toUpperCase(Locale.ROOT);
        }

        if (listing.pricing() != null && StringUtils.hasText(listing.pricing().currency())) {
            return listing.pricing().currency().trim().toUpperCase(Locale.ROOT);
        }

        return DEFAULT_CURRENCY;
    }

    private String cancellationPolicyCode(ListingResponse listing) {
        return StringUtils.hasText(listing.cancellationPolicyCode())
                ? listing.cancellationPolicyCode().trim().toUpperCase(Locale.ROOT)
                : DEFAULT_CANCELLATION_POLICY_CODE;
    }

    private String coverPhoto(List<ListingPhotoResponse> photos) {
        if (photos == null || photos.isEmpty()) {
            return null;
        }

        return photos.stream()
                .filter(photo -> Boolean.TRUE.equals(photo.isCover()) && StringUtils.hasText(photo.photoUrl()))
                .map(ListingPhotoResponse::photoUrl)
                .findFirst()
                .orElseGet(() -> photos.stream()
                        .map(ListingPhotoResponse::photoUrl)
                        .filter(StringUtils::hasText)
                        .findFirst()
                        .orElse(null));
    }

    private String location(ListingResponse listing) {
        return List.of(nullToEmpty(listing.city()), nullToEmpty(listing.country()))
                .stream()
                .filter(StringUtils::hasText)
                .reduce((left, right) -> left + ", " + right)
                .orElse("Viet Nam");
    }

    private int adultCount(Integer value) {
        return value != null && value > 0 ? value : 1;
    }

    private int safeCount(Integer value) {
        return value != null && value > 0 ? value : 0;
    }

    private String nullToEmpty(Object value) {
        return value != null ? value.toString() : "";
    }

    private record ToolConversationScope(String userId, String conversationId) {
    }

    private record ListingReference(UUID listingId, String title, String message) {
        private static ListingReference resolved(UUID listingId, String title) {
            return new ListingReference(listingId, title, null);
        }

        private static ListingReference unresolved(String message) {
            return new ListingReference(null, null, message);
        }

        private boolean resolved() {
            return listingId != null;
        }
    }
}
