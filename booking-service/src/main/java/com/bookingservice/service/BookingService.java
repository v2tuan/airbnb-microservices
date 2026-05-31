package com.bookingservice.service;

import com.bookingservice.dto.request.BookingFilterType;
import com.bookingservice.dto.request.BookingRefundRequest;
import com.bookingservice.dto.request.CancelBookingRequest;
import com.bookingservice.dto.request.ConfirmCancellationQuoteRequest;
import com.bookingservice.dto.request.ConfirmHostCancellationQuoteRequest;
import com.bookingservice.dto.request.CreateBookingRequest;
import com.bookingservice.dto.request.HostCancellationQuoteRequest;
import com.bookingservice.dto.request.ListingBatchRequest;
import com.bookingservice.dto.request.ListingSuspensionRequest;
import com.bookingservice.dto.request.UpdateBookingStatusRequest;
import com.bookingservice.dto.response.BookingDetailResponse;
import com.bookingservice.dto.response.BookingResponse;
import com.bookingservice.dto.response.BookingTripResponse;
import com.bookingservice.dto.response.CreateBookingResponse;
import com.bookingservice.dto.response.GuestCancellationQuoteResponse;
import com.bookingservice.dto.response.HostCancellationQuoteResponse;
import com.bookingservice.dto.response.HostReservationsPageResponse;
import com.bookingservice.dto.response.ListingResponse;
import com.bookingservice.dto.response.PublicUserResponse;
import com.bookingservice.dto.response.ReservationDetailResponse;
import com.bookingservice.dto.response.ReservationResponse;
import com.bookingservice.constant.ListingStatus;
import com.bookingservice.entity.Booking;
import com.bookingservice.entity.BookingCancellationQuote;
import com.bookingservice.entity.BookingStatus;
import com.bookingservice.entity.HostCancellationQuote;
import com.bookingservice.repository.BookingCancellationQuoteRepository;
import com.bookingservice.repository.BookingRepository;
import com.bookingservice.repository.HostCancellationQuoteRepository;
import com.bookingservice.repository.client.ListingClient;
import com.bookingservice.repository.client.PaymentClient;
import com.bookingservice.repository.client.UserClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {
    private static final String DEFAULT_CANCELLATION_POLICY_CODE = "FLEXIBLE";
    private static final int GUEST_CANCELLATION_QUOTE_TTL_MINUTES = 10;
    private static final int HOST_CANCELLATION_QUOTE_TTL_MINUTES = 10;

    private final BookingRepository bookingRepository;
    private final BookingCancellationQuoteRepository cancellationQuoteRepository;
    private final HostCancellationQuoteRepository hostCancellationQuoteRepository;
    private final ListingClient listingClient;
    private final PaymentClient paymentClient;
    private final UserClient userClient;
    private final HostPenaltyService hostPenaltyService;

    private record PricingSnapshot(
            BigDecimal nightlyPrice,
            BigDecimal accommodationSubtotal,
            BigDecimal cleaningFee,
            BigDecimal serviceFee,
            BigDecimal taxes,
            BigDecimal totalAmount,
            String currency,
            String cancellationPolicyCode
    ) {
    }

    private record RefundBreakdown(
            BigDecimal accommodationRefund,
            BigDecimal cleaningFeeRefund,
            BigDecimal serviceFeeRefund,
            BigDecimal taxesRefund,
            BigDecimal refundAmount,
            BigDecimal nonRefundableAmount
    ) {
    }

    @Transactional
    public CreateBookingResponse createBooking(CreateBookingRequest request) {
        Jwt jwt = currentJwt();
        UUID guestId = UUID.fromString(jwt.getSubject());

        if (!request.getCheckOutDate().isAfter(request.getCheckInDate())) {
            throw new IllegalArgumentException("Check-out date must be after check-in date");
        }

        // Lock listing ngăn double booking
        bookingRepository.acquireListingBookingLock(request.getRoomId().toString());

        ListingResponse listing = listingClient
                .getListingById("Bearer " + jwt.getTokenValue(), request.getRoomId())
                .getData();
        validateListingApproval(listing, request);

        List<Booking> conflictingBookings = bookingRepository.findConflictingBookings(
                request.getRoomId(), request.getCheckInDate(), request.getCheckOutDate());
        if (!conflictingBookings.isEmpty()) {
            throw new IllegalStateException("Listing is not available for the selected dates");
        }

        int totalNights = (int) ChronoUnit.DAYS.between(request.getCheckInDate(), request.getCheckOutDate());
        PricingSnapshot pricing = buildPricingSnapshot(listing, request, totalNights);
        Booking booking = Booking.builder()
                .listingId(request.getRoomId())
                .hostId(UUID.fromString(listing.getHostId()))
                .guestId(guestId)
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .totalNights(totalNights)
                .nightlyPrice(pricing.nightlyPrice())
                .accommodationSubtotal(pricing.accommodationSubtotal())
                .cleaningFee(pricing.cleaningFee())
                .serviceFee(pricing.serviceFee())
                .taxes(pricing.taxes())
                .totalPrice(toPaymentAmount(pricing.totalAmount()))
                .currency(pricing.currency())
                .cancellationPolicyCode(pricing.cancellationPolicyCode())
                .hostPayoutEligible(resolveHostPayoutEligibility(listing))
                .numAdults(adultCount(request.getNumberOfAdults()))
                .numChildren(safeCount(request.getNumberOfChildren()))
                .numInfants(safeCount(request.getNumberOfInfants()))
                .numPets(safeCount(request.getNumberOfPets()))
                .guestNotes(request.getGuestNotes())
                .status(BookingStatus.PENDING_PAYMENT)
                .build();

        Booking saved = bookingRepository.save(booking);
        return CreateBookingResponse.builder()
                .bookingId(saved.getBookingId())
                .hostId(saved.getHostId().toString())
                .status(saved.getStatus())
                .totalAmount(saved.getTotalPrice())
                .currency(saved.getCurrency())
                .expiresAt(saved.getExpiresAt())
                .message("Booking created. Complete payment before it expires.")
                .build();
    }

    @Transactional
    public BookingResponse updateBookingStatus(UUID bookingId, UpdateBookingStatusRequest request) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));
        if (request.getStatus() == BookingStatus.CANCELLED_BY_HOST) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Host cancellation quote is required");
        }

        if (booking.getStatus() == request.getStatus()) {
            if (request.getPaymentIntentId() != null && booking.getPaymentIntentId() == null) {
                booking.setPaymentIntentId(request.getPaymentIntentId());
            }
            return mapToResponse(bookingRepository.save(booking));
        }

        validateStatusTransition(booking.getStatus(), request.getStatus());
        booking.setStatus(request.getStatus());

        if (request.getPaymentIntentId() != null) {
            booking.setPaymentIntentId(request.getPaymentIntentId());
        }
        if (request.getStatus() == BookingStatus.CONFIRMED) {
            booking.setPaidAt(LocalDateTime.now());
        }
        if (request.getStatus() == BookingStatus.CHECKED_IN && booking.getCheckedInAt() == null) {
            booking.setCheckedInAt(LocalDateTime.now());
        }
        if ((request.getStatus() == BookingStatus.CHECKED_OUT || request.getStatus() == BookingStatus.COMPLETED)
                && booking.getCheckedOutAt() == null) {
            booking.setCheckedOutAt(LocalDateTime.now());
        }
        if (request.getStatus() == BookingStatus.COMPLETED && booking.getCompletedAt() == null) {
            booking.setCompletedAt(LocalDateTime.now());
        }
        if (isCancelledStatus(request.getStatus()) && booking.getCancelledAt() == null) {
            booking.setCancelledAt(LocalDateTime.now());
        }
        if (isCancelledStatus(request.getStatus()) && request.getReason() != null) {
            booking.setCancellationReason(request.getReason());
        }

        return mapToResponse(bookingRepository.save(booking));
    }

    @Transactional(readOnly = true)
    public BookingResponse getBooking(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .map(this::mapToResponse)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));
    }

    @Transactional(readOnly = true)
    public BookingDetailResponse getMyBookingDetail(UUID bookingId) {
        Jwt jwt = currentJwt();
        UUID guestId = UUID.fromString(jwt.getSubject());
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (!booking.getGuestId().equals(guestId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }

        ListingResponse listing = listingClient
                .getListingById("Bearer " + jwt.getTokenValue(), booking.getListingId())
                .getData();

        PublicUserResponse host = fetchHostProfile(booking.getHostId());
        return mapToDetailResponse(booking, listing, host);
    }

    @Transactional
    public BookingResponse cancelMyBooking(UUID bookingId, CancelBookingRequest request) {
        UUID guestId = UUID.fromString(currentJwt().getSubject());
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if (!booking.getGuestId().equals(guestId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }

        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT
                && booking.getExpiresAt() != null
                && booking.getExpiresAt().isBefore(LocalDateTime.now())) {
            booking.setStatus(BookingStatus.EXPIRED);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking payment hold has expired");
        }

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancellation quote is required");
        }

        booking.setStatus(BookingStatus.EXPIRED);
        booking.setCancellationReason(request.getReason());
        return mapToResponse(bookingRepository.save(booking));
    }

    @Transactional
    public GuestCancellationQuoteResponse requestGuestCancellationQuote(UUID bookingId) {
        UUID guestId = UUID.fromString(currentJwt().getSubject());
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        validateGuestCancellationEligibility(booking, guestId);

        String policyCode = normalizeCancellationPolicyCode(booking.getCancellationPolicyCode());
        RefundBreakdown breakdown = calculateGuestRefund(booking, policyCode, LocalDateTime.now());
        BookingCancellationQuote quote = cancellationQuoteRepository.save(BookingCancellationQuote.builder()
                .bookingId(booking.getBookingId())
                .guestId(guestId)
                .policyCode(policyCode)
                .currency(booking.getCurrency())
                .accommodationRefund(breakdown.accommodationRefund())
                .cleaningFeeRefund(breakdown.cleaningFeeRefund())
                .serviceFeeRefund(breakdown.serviceFeeRefund())
                .taxesRefund(breakdown.taxesRefund())
                .refundAmount(breakdown.refundAmount())
                .nonRefundableAmount(breakdown.nonRefundableAmount())
                .expiresAt(LocalDateTime.now().plusMinutes(GUEST_CANCELLATION_QUOTE_TTL_MINUTES))
                .build());

        return mapToGuestCancellationQuoteResponse(quote);
    }

    @Transactional
    public BookingResponse confirmGuestCancellationQuote(UUID bookingId, ConfirmCancellationQuoteRequest request) {
        Jwt jwt = currentJwt();
        UUID guestId = UUID.fromString(jwt.getSubject());
        LocalDateTime now = LocalDateTime.now();

        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        validateGuestCancellationEligibility(booking, guestId);

        BookingCancellationQuote quote = cancellationQuoteRepository
                .findByQuoteIdAndBookingIdForUpdate(request.getQuoteId(), bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cancellation quote not found"));

        if (!quote.getGuestId().equals(guestId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cancellation quote not found");
        }
        if (quote.getConfirmedAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancellation quote has already been used");
        }
        if (!quote.getExpiresAt().isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancellation quote has expired");
        }

        booking.setStatus(BookingStatus.CANCELLED_BY_GUEST);
        booking.setCancelledAt(now);
        booking.setCancellationReason(request.getReason());
        quote.setConfirmedAt(now);

        Booking saved = bookingRepository.save(booking);
        cancellationQuoteRepository.save(quote);

        if (quote.getRefundAmount().compareTo(BigDecimal.ZERO) > 0) {
            paymentClient.createBookingRefund(
                    "Bearer " + jwt.getTokenValue(),
                    bookingId,
                    BookingRefundRequest.builder()
                            .refundAmount(quote.getRefundAmount())
                            .refundReason("GUEST_CANCELLATION")
                            .refundDetails("Guest cancellation quote " + quote.getQuoteId())
                            .build()
            );
        }

        return mapToResponse(saved);
    }

    @Transactional
    public HostCancellationQuoteResponse requestHostCancellationQuote(
            UUID bookingId,
            HostCancellationQuoteRequest request
    ) {
        Jwt jwt = currentJwt();
        UUID hostId = UUID.fromString(jwt.getSubject());
        LocalDateTime now = LocalDateTime.now();
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));

        validateHostCancellationEligibility(booking, hostId, jwt);

        int penaltyPoints = calculateHostPenaltyPoints(booking, now);
        HostPenaltyService.ThresholdPreview threshold = hostPenaltyService.previewThresholds(booking, now);
        HostCancellationQuote quote = hostCancellationQuoteRepository.save(HostCancellationQuote.builder()
                .bookingId(booking.getBookingId())
                .hostId(booking.getHostId())
                .listingId(booking.getListingId())
                .reasonCode(request.getReasonCode())
                .guestRefundAmount(money(BigDecimal.valueOf(booking.getTotalPrice())))
                .currency(booking.getCurrency())
                .penaltyPoints(penaltyPoints)
                .listingActivePenaltyCount(threshold.listingActivePenaltyCount())
                .hostActivePenaltyCount(threshold.hostActivePenaltyCount())
                .willSuspendListing(threshold.willSuspendListing())
                .listingSuspendedUntil(threshold.listingSuspendedUntil())
                .willMarkHostAdminReview(threshold.willMarkHostAdminReview())
                .expiresAt(now.plusMinutes(HOST_CANCELLATION_QUOTE_TTL_MINUTES))
                .build());

        return mapToHostCancellationQuoteResponse(quote);
    }

    @Transactional
    public ReservationDetailResponse confirmHostCancellationQuote(
            UUID bookingId,
            ConfirmHostCancellationQuoteRequest request
    ) {
        Jwt jwt = currentJwt();
        UUID hostId = UUID.fromString(jwt.getSubject());
        LocalDateTime now = LocalDateTime.now();
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));

        validateHostCancellationEligibility(booking, hostId, jwt);

        HostCancellationQuote quote = hostCancellationQuoteRepository
                .findByQuoteIdAndBookingIdForUpdate(request.getQuoteId(), bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cancellation quote not found"));

        if (!quote.getHostId().equals(booking.getHostId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cancellation quote not found");
        }
        if (quote.getConfirmedAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancellation quote has already been used");
        }
        if (!quote.getExpiresAt().isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancellation quote has expired");
        }

        booking.setStatus(BookingStatus.CANCELLED_BY_HOST);
        booking.setCancelledAt(now);
        booking.setCancellationReason(resolveHostCancellationReason(request.getReason(), quote));
        quote.setConfirmedAt(now);

        Booking saved = bookingRepository.save(booking);
        hostCancellationQuoteRepository.save(quote);

        paymentClient.createBookingRefund(
                "Bearer " + jwt.getTokenValue(),
                bookingId,
                BookingRefundRequest.builder()
                        .refundAmount(quote.getGuestRefundAmount())
                        .refundReason("HOST_CANCELLATION")
                        .refundDetails("Host cancellation quote " + quote.getQuoteId()
                                + ", reason=" + quote.getReasonCode()
                                + ", penaltyPoints=" + quote.getPenaltyPoints())
                        .build()
        );
        hostPenaltyService.createActivePenalty(saved, quote);
        applyHostPenaltyThresholdActions(jwt, quote);

        ListingResponse listing = listingClient
                .getListingById("Bearer " + jwt.getTokenValue(), saved.getListingId())
                .getData();
        return mapToReservationDetailResponse(saved, listing, fetchGuestProfile(saved.getGuestId()));
    }

    @Transactional
    public BookingResponse checkIn(UUID bookingId) {
        return updateBookingStatus(bookingId, UpdateBookingStatusRequest.builder()
                .status(BookingStatus.CHECKED_IN)
                .build());
    }

    @Transactional
    public BookingResponse checkOut(UUID bookingId) {
        return updateBookingStatus(bookingId, UpdateBookingStatusRequest.builder()
                .status(BookingStatus.CHECKED_OUT)
                .build());
    }

    @Transactional
    public BookingResponse complete(UUID bookingId) {
        return updateBookingStatus(bookingId, UpdateBookingStatusRequest.builder()
                .status(BookingStatus.COMPLETED)
                .build());
    }

    @Transactional
    public int expirePendingBookings() {
        List<Booking> expired = bookingRepository.findExpiredPendingForUpdate(LocalDateTime.now());
        expired.forEach(booking -> booking.setStatus(BookingStatus.EXPIRED));
        bookingRepository.saveAll(expired);
        return expired.size();
    }

    private void validateStatusTransition(BookingStatus currentStatus, BookingStatus newStatus) {
        boolean isValid = switch (currentStatus) {
            case PENDING_PAYMENT -> newStatus == BookingStatus.CONFIRMED
                    || newStatus == BookingStatus.EXPIRED;
            case CONFIRMED -> newStatus == BookingStatus.CHECKED_IN
                    || isCancelledStatus(newStatus);
            case CHECKED_IN -> newStatus == BookingStatus.CHECKED_OUT
                    || newStatus == BookingStatus.CANCELLED_BY_ADMIN;
            case CHECKED_OUT -> newStatus == BookingStatus.COMPLETED;
            case EXPIRED, COMPLETED, CANCELLED_BY_GUEST, CANCELLED_BY_HOST, CANCELLED_BY_ADMIN -> false;
        };

        if (!isValid) {
            throw new IllegalStateException("Invalid booking transition from " + currentStatus + " to " + newStatus);
        }
    }

    private boolean isCancelledStatus(BookingStatus status) {
        return status == BookingStatus.CANCELLED_BY_GUEST
                || status == BookingStatus.CANCELLED_BY_HOST
                || status == BookingStatus.CANCELLED_BY_ADMIN;
    }

    private void validateListingApproval(ListingResponse listing, CreateBookingRequest request) {
        if (listing == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found");
        }
        if (listing.getStatus() == ListingStatus.SUSPENDED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing is suspended");
        }
        if (listing.getStatus() != ListingStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing is not active");
        }
        if (listing.getHostId() == null || listing.getHostId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing host is not payout eligible");
        }
        if (listing.getPricing() == null || listing.getPricing().getBasePrice() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing pricing is not configured");
        }
        if (listing.getMaxGuests() == null || listing.getMaxGuests() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing capacity is not configured");
        }

        int stayingGuests = adultCount(request.getNumberOfAdults()) + safeCount(request.getNumberOfChildren());
        if (stayingGuests <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one adult or child is required");
        }
        if (stayingGuests > listing.getMaxGuests()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guest count exceeds listing capacity");
        }

        int pets = safeCount(request.getNumberOfPets());
        boolean petsAllowed = listing.getHouseRules() != null && Boolean.TRUE.equals(listing.getHouseRules().getPetsAllowed());
        if (pets > 0 && !petsAllowed) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pets are not allowed for this listing");
        }
    }

    private PricingSnapshot buildPricingSnapshot(
            ListingResponse listing,
            CreateBookingRequest request,
            int totalNights
    ) {
        BigDecimal nightlyPrice = money(listing.getPricing().getBasePrice());
        BigDecimal subtotal = money(nightlyPrice.multiply(BigDecimal.valueOf(totalNights)));
        BigDecimal cleaningFee = money(listing.getPricing().getCleaningFee());
        BigDecimal serviceFeePercentage = listing.getPricing().getServiceFeePercentage() != null
                ? listing.getPricing().getServiceFeePercentage()
                : BigDecimal.ZERO;
        BigDecimal serviceFee = money(subtotal
                .multiply(serviceFeePercentage)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
        BigDecimal taxes = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = money(subtotal.add(cleaningFee).add(serviceFee).add(taxes));
        String currency = resolveSnapshotCurrency(listing, request);

        return new PricingSnapshot(
                nightlyPrice,
                subtotal,
                cleaningFee,
                serviceFee,
                taxes,
                total,
                currency,
                resolveCancellationPolicyCode(listing)
        );
    }

    private String resolveCancellationPolicyCode(ListingResponse listing) {
        String code = listing.getCancellationPolicyCode();
        return code == null || code.isBlank()
                ? DEFAULT_CANCELLATION_POLICY_CODE
                : code.trim().toUpperCase();
    }

    private String normalizeCancellationPolicyCode(String code) {
        if (code == null || code.isBlank()) {
            return DEFAULT_CANCELLATION_POLICY_CODE;
        }
        String normalized = code.trim().toUpperCase();
        return switch (normalized) {
            case "FLEXIBLE", "MODERATE", "STRICT" -> normalized;
            default -> DEFAULT_CANCELLATION_POLICY_CODE;
        };
    }

    private void validateGuestCancellationEligibility(Booking booking, UUID guestId) {
        if (!booking.getGuestId().equals(guestId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking cannot be cancelled");
        }
        if (booking.getCheckedInAt() != null || !LocalDate.now().isBefore(booking.getCheckInDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Guest cancellation is not available after check-in");
        }
        if (booking.getPaymentIntentId() == null || booking.getPaymentIntentId().isBlank() || booking.getPaidAt() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Paid booking is required before cancellation");
        }
    }

    private void validateHostCancellationEligibility(Booking booking, UUID hostId, Jwt jwt) {
        boolean admin = isAdmin(jwt);
        if (!admin && !booking.getHostId().equals(hostId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found");
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Reservation cannot be cancelled by host");
        }
        if (booking.getCheckedInAt() != null || !LocalDate.now().isBefore(booking.getCheckInDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Host cancellation is not available after check-in");
        }
        if (booking.getPaymentIntentId() == null || booking.getPaymentIntentId().isBlank() || booking.getPaidAt() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Paid reservation is required before cancellation");
        }
    }

    private int calculateHostPenaltyPoints(Booking booking, LocalDateTime now) {
        long hoursUntilCheckIn = ChronoUnit.HOURS.between(now, booking.getCheckInDate().atStartOfDay());
        if (hoursUntilCheckIn > 24L * 7L) {
            return 1;
        }
        if (hoursUntilCheckIn >= 24L) {
            return 2;
        }
        return 3;
    }

    private String resolveHostCancellationReason(String reason, HostCancellationQuote quote) {
        String trimmed = reason == null ? "" : reason.trim();
        if (trimmed.isBlank()) {
            return "Host cancellation: " + quote.getReasonCode();
        }
        return "Host cancellation: " + quote.getReasonCode() + " - " + trimmed;
    }

    private void applyHostPenaltyThresholdActions(Jwt jwt, HostCancellationQuote quote) {
        if (!Boolean.TRUE.equals(quote.getWillSuspendListing())) {
            return;
        }

        try {
            listingClient.suspendListing(
                    "Bearer " + jwt.getTokenValue(),
                    quote.getListingId(),
                    ListingSuspensionRequest.builder()
                            .suspendedUntil(quote.getListingSuspendedUntil())
                            .reason("Host cancellation threshold reached for listing penalties")
                            .build()
            );
        } catch (Exception exception) {
            log.warn("Failed to suspend listing {} after host penalty threshold", quote.getListingId(), exception);
        }
    }

    private RefundBreakdown calculateGuestRefund(Booking booking, String policyCode, LocalDateTime now) {
        BigDecimal accommodation = snapshotAmount(booking.getAccommodationSubtotal());
        BigDecimal cleaningFee = snapshotAmount(booking.getCleaningFee());
        BigDecimal serviceFee = snapshotAmount(booking.getServiceFee());
        BigDecimal taxes = snapshotAmount(booking.getTaxes());
        BigDecimal totalPaid = money(BigDecimal.valueOf(booking.getTotalPrice()));
        LocalDateTime checkInAt = booking.getCheckInDate().atStartOfDay();
        long hoursUntilCheckIn = ChronoUnit.HOURS.between(now, checkInAt);

        BigDecimal accommodationRefund;
        BigDecimal cleaningFeeRefund;
        BigDecimal serviceFeeRefund;
        BigDecimal taxesRefund = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        switch (policyCode) {
            case "MODERATE" -> {
                if (hoursUntilCheckIn >= 24L * 5L) {
                    accommodationRefund = accommodation;
                    cleaningFeeRefund = cleaningFee;
                    serviceFeeRefund = serviceFee;
                    taxesRefund = taxes;
                } else if (hoursUntilCheckIn >= 24L) {
                    accommodationRefund = money(accommodation.multiply(BigDecimal.valueOf(0.5)));
                    cleaningFeeRefund = cleaningFee;
                    serviceFeeRefund = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                } else {
                    accommodationRefund = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                    cleaningFeeRefund = cleaningFee;
                    serviceFeeRefund = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                }
            }
            case "STRICT" -> {
                if (hoursUntilCheckIn >= 24L * 7L) {
                    accommodationRefund = money(accommodation.multiply(BigDecimal.valueOf(0.5)));
                    cleaningFeeRefund = cleaningFee;
                    serviceFeeRefund = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                } else {
                    accommodationRefund = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                    cleaningFeeRefund = cleaningFee;
                    serviceFeeRefund = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                }
            }
            default -> {
                if (hoursUntilCheckIn >= 24L) {
                    accommodationRefund = accommodation;
                    cleaningFeeRefund = cleaningFee;
                    serviceFeeRefund = serviceFee;
                    taxesRefund = taxes;
                } else {
                    int unusedNights = Math.max(0, safeCount(booking.getTotalNights()) - 1);
                    accommodationRefund = capMoney(
                            snapshotAmount(booking.getNightlyPrice()).multiply(BigDecimal.valueOf(unusedNights)),
                            accommodation
                    );
                    cleaningFeeRefund = cleaningFee;
                    serviceFeeRefund = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                }
            }
        }

        BigDecimal refundAmount = capMoney(
                accommodationRefund.add(cleaningFeeRefund).add(serviceFeeRefund).add(taxesRefund),
                totalPaid
        );
        BigDecimal nonRefundableAmount = money(totalPaid.subtract(refundAmount).max(BigDecimal.ZERO));

        return new RefundBreakdown(
                money(accommodationRefund),
                money(cleaningFeeRefund),
                money(serviceFeeRefund),
                money(taxesRefund),
                refundAmount,
                nonRefundableAmount
        );
    }

    private BigDecimal capMoney(BigDecimal amount, BigDecimal max) {
        BigDecimal normalized = money(amount);
        BigDecimal normalizedMax = money(max);
        if (normalized.compareTo(normalizedMax) > 0) {
            return normalizedMax;
        }
        if (normalized.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return normalized;
    }

    private String resolveSnapshotCurrency(ListingResponse listing, CreateBookingRequest request) {
        String listingCurrency = listing.getPricing() != null ? normalizeCurrency(listing.getPricing().getCurrency()) : null;
        String requestedCurrency = normalizeCurrency(request.getCurrency());
        if (listingCurrency != null && requestedCurrency != null && !listingCurrency.equals(requestedCurrency)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Requested currency does not match listing pricing currency");
        }
        if (listingCurrency != null) {
            return listingCurrency;
        }
        return requestedCurrency != null ? requestedCurrency : "USD";
    }

    private String normalizeCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return null;
        }
        return currency.trim().toUpperCase();
    }

    private boolean resolveHostPayoutEligibility(ListingResponse listing) {
        return listing.getHostId() != null && !listing.getHostId().isBlank();
    }

    private int safeCount(Integer value) {
        return value != null ? value : 0;
    }

    private int adultCount(Integer value) {
        return value != null ? value : 1;
    }

    private BigDecimal money(BigDecimal value) {
        return (value != null ? value : BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal snapshotAmount(BigDecimal value) {
        return money(value);
    }

    private long toPaymentAmount(BigDecimal amount) {
        return amount.setScale(0, RoundingMode.HALF_UP).longValue();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getBookingsByUserAndStatuses(List<BookingStatus> statuses) {
        UUID guestId = UUID.fromString(currentJwt().getSubject());
        List<Booking> bookings = statuses == null || statuses.isEmpty()
                ? bookingRepository.findByGuestId(guestId)
                : bookingRepository.findByGuestIdAndStatusIn(guestId, statuses);
        return bookings.stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingTripResponse> getMyBookings(BookingFilterType type) {
        Jwt jwt = currentJwt();
        UUID userId = UUID.fromString(jwt.getSubject());

        List<Booking> bookings = bookingRepository.findBookingsByType(userId, type.name(), LocalDateTime.now());
        if (bookings.isEmpty()) {
            return List.of();
        }

        List<UUID> listingIds = bookings.stream().map(Booking::getListingId).distinct().toList();
        List<ListingResponse> listings = listingClient
                .getListingsByIds("Bearer " + jwt.getTokenValue(), new ListingBatchRequest(listingIds))
                .getData();

        Map<UUID, ListingResponse> listingMap = listings.stream()
                .collect(java.util.stream.Collectors.toMap(ListingResponse::getListingId, listing -> listing));

        return bookings.stream()
                .map(booking -> mapToTripResponse(booking, listingMap.get(booking.getListingId())))
                .toList();
    }

    /**
     * Lấy danh sách reservation của một listing cho host/admin.
     *
     * Input: listingId và optional statuses từ dashboard.
     * Xử lý:
     * - Load listing từ Listing Service để biết host sở hữu listing.
     * - Admin được xem tất cả, host chỉ được xem listing có hostId trùng JWT subject.
     * - Query Booking theo listing/status, sau đó enrich guest profile để card có tên/avatar.
     * Output: danh sách ReservationResponse đủ dữ liệu cho list, stats và calendar.
     */
    @Transactional(readOnly = true)
    public List<ReservationResponse> getReservationsByListing(UUID listingId, List<BookingStatus> statuses) {
        Jwt jwt = currentJwt();
        boolean admin = isAdmin(jwt);

        ListingResponse listing = listingClient
                .getListingById("Bearer " + jwt.getTokenValue(), listingId)
                .getData();

        if (listing == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found");
        }

        UUID hostId = UUID.fromString(listing.getHostId());
        if (!admin && !hostId.toString().equals(jwt.getSubject())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot manage reservations for this listing");
        }

        List<Booking> bookings = findReservationsForListing(listingId, admin ? null : hostId, statuses);
        return bookings.stream()
                .map(booking -> mapToReservationResponse(booking, listing, fetchGuestProfile(booking.getGuestId())))
                .toList();
    }

    /**
     * Endpoint production cho dashboard reservation của host.
     *
     * Vì sao cần method mới thay vì để frontend tự Promise.all từng listing:
     * - Pagination phải xảy ra sau khi đã gom toàn bộ scope. Nếu client lấy từng listing rồi slice,
     *   page 1/page 2 sẽ phụ thuộc vào số lượng listing và dễ thiếu reservation.
     * - Search/filter phải chạy trên cùng một snapshot dữ liệu backend. Nếu search ở frontend,
     *   host buộc phải tải toàn bộ booking trước, không scale khi portfolio lớn.
     * - Metric/tab count/calendar vẫn cần dữ liệu aggregate ngoài page hiện tại. Response vì vậy trả
     *   cả metadata đã tính sẵn để không downgrade UX cũ.
     *
     * Tradeoff hiện tại:
     * Booking DB chỉ lưu listingId/guestId, còn title/city/guestName nằm ở service khác. Để giữ đúng
     * behavior search cũ, backend phải enrich trước rồi match search. Khi traffic lớn hơn, nên denormalize
     * các field searchable vào Booking read-model hoặc đẩy sang Search Service để pagination được thực hiện
     * trực tiếp bằng DB/search index thay vì lọc trong memory sau bước enrich.
     */
    @Transactional(readOnly = true)
    public HostReservationsPageResponse getHostReservations(
            UUID listingId,
            List<BookingStatus> statuses,
            String search,
            LocalDate dateFrom,
            LocalDate dateTo,
            int page,
            int size
    ) {
        Jwt jwt = currentJwt();
        boolean admin = isAdmin(jwt);
        UUID currentUserId = UUID.fromString(jwt.getSubject());
        String bearerToken = "Bearer " + jwt.getTokenValue();

        List<ListingResponse> scopeListings = resolveReservationScopeListings(bearerToken, listingId, currentUserId, admin);
        Map<UUID, ListingResponse> listingMap = scopeListings.stream()
                .collect(Collectors.toMap(ListingResponse::getListingId, Function.identity(), (left, right) -> left));

        if (scopeListings.isEmpty()) {
            return emptyHostReservationsPage(page, size);
        }

        List<Booking> scopeBookings = listingId != null
                ? findReservationsForListing(listingId, admin ? null : currentUserId, null)
                : bookingRepository.findByHostIdOrderByCheckInDateDescCreatedAtDesc(currentUserId);

        Map<UUID, PublicUserResponse> guestMap = fetchGuestProfiles(scopeBookings);
        List<ReservationResponse> scopedReservations = scopeBookings.stream()
                .map(booking -> mapToReservationResponse(
                        booking,
                        listingMap.get(booking.getListingId()),
                        guestMap.get(booking.getGuestId())
                ))
                .toList();

        List<ReservationResponse> filteredReservations = sortReservationResponses(
                scopedReservations.stream()
                        .filter(reservation -> reservationMatchesQuery(reservation, statuses, search, dateFrom, dateTo))
                        .toList()
        );

        int safeSize = Math.max(1, Math.min(size, 100));
        int safePage = Math.max(0, page);
        int fromIndex = Math.min(safePage * safeSize, filteredReservations.size());
        int toIndex = Math.min(fromIndex + safeSize, filteredReservations.size());
        List<ReservationResponse> content = filteredReservations.subList(fromIndex, toIndex);
        int totalPages = filteredReservations.isEmpty()
                ? 1
                : (int) Math.ceil((double) filteredReservations.size() / safeSize);

        return HostReservationsPageResponse.builder()
                .content(content)
                .page(safePage)
                .size(safeSize)
                .totalElements(filteredReservations.size())
                .totalPages(totalPages)
                .stats(buildReservationStats(scopedReservations))
                .statusCounts(buildStatusCounts(scopedReservations))
                .occupiedDates(buildOccupiedDates(filteredReservations))
                .nextReservations(buildNextReservations(filteredReservations))
                .build();
    }

    /**
     * Lấy detail một reservation cho host/admin.
     *
     * Reservation dùng chung entity Booking nên bước quan trọng nhất là kiểm quyền quản lý
     * trước khi enrich dữ liệu listing/guest/payment cho màn detail.
     */
    @Transactional(readOnly = true)
    public ReservationDetailResponse getReservationDetail(UUID reservationId) {
        Jwt jwt = currentJwt();
        Booking booking = bookingRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));

        ensureCanManageReservation(jwt, booking);

        ListingResponse listing = listingClient
                .getListingById("Bearer " + jwt.getTokenValue(), booking.getListingId())
                .getData();
        return mapToReservationDetailResponse(booking, listing, fetchGuestProfile(booking.getGuestId()));
    }

    /**
     * Cập nhật trạng thái reservation từ host/admin.
     *
     * Input: reservationId + status/reason.
     * Xử lý: lock row Booking, kiểm quyền, chặn host set trạng thái thuộc payment flow,
     * validate transition, set timestamp nghiệp vụ, lưu DB.
     * Output: ReservationDetailResponse mới nhất để frontend thay thế optimistic state.
     */
    @Transactional
    public ReservationDetailResponse updateReservationStatus(UUID reservationId, UpdateBookingStatusRequest request) {
        Jwt jwt = currentJwt();
        Booking booking = bookingRepository.findByIdForUpdate(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));

        ensureCanManageReservation(jwt, booking);
        validateReservationManagementStatus(request.getStatus());
        if (request.getStatus() == BookingStatus.CANCELLED_BY_HOST) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Host cancellation quote is required");
        }

        // Chỉ đổi status khi status mới khác status hiện tại; nếu trùng, vẫn cho phép cập nhật reason/timestamp liên quan.
        if (booking.getStatus() != request.getStatus()) {
            validateStatusTransition(booking.getStatus(), request.getStatus());
            booking.setStatus(request.getStatus());
        }

        if (request.getPaymentIntentId() != null) {
            booking.setPaymentIntentId(request.getPaymentIntentId());
        }
        if (request.getStatus() == BookingStatus.CHECKED_IN && booking.getCheckedInAt() == null) {
            booking.setCheckedInAt(LocalDateTime.now());
        }
        if ((request.getStatus() == BookingStatus.CHECKED_OUT || request.getStatus() == BookingStatus.COMPLETED)
                && booking.getCheckedOutAt() == null) {
            booking.setCheckedOutAt(LocalDateTime.now());
        }
        if (request.getStatus() == BookingStatus.COMPLETED && booking.getCompletedAt() == null) {
            booking.setCompletedAt(LocalDateTime.now());
        }
        if (isCancelledStatus(request.getStatus()) && booking.getCancelledAt() == null) {
            booking.setCancelledAt(LocalDateTime.now());
        }
        if (isCancelledStatus(request.getStatus()) && request.getReason() != null) {
            booking.setCancellationReason(request.getReason());
        }

        Booking saved = bookingRepository.save(booking);
        ListingResponse listing = listingClient
                .getListingById("Bearer " + jwt.getTokenValue(), saved.getListingId())
                .getData();
        return mapToReservationDetailResponse(saved, listing, fetchGuestProfile(saved.getGuestId()));
    }

    private List<ListingResponse> resolveReservationScopeListings(
            String bearerToken,
            UUID listingId,
            UUID currentUserId,
            boolean admin
    ) {
        if (listingId != null) {
            ListingResponse listing = listingClient.getListingById(bearerToken, listingId).getData();
            if (listing == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found");
            }

            UUID listingHostId = UUID.fromString(listing.getHostId());
            if (!admin && !listingHostId.equals(currentUserId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot manage reservations for this listing");
            }

            return List.of(listing);
        }

        /*
         * Scope "All listings" phải được resolve ở backend.
         *
         * Nếu để frontend tự lấy listing rồi gọi reservations theo từng listing, request A của scope cũ
         * có thể về sau request B của scope mới và ghi đè UI. Frontend vẫn có stale guard, nhưng backend
         * aggregation giảm số request cạnh tranh và tạo một boundary rõ: một query dashboard = một response.
         */
        List<ListingResponse> listings = listingClient.getListingsByHost(bearerToken, currentUserId.toString()).getData();
        return listings != null ? listings : List.of();
    }

    private HostReservationsPageResponse emptyHostReservationsPage(int page, int size) {
        int safeSize = Math.max(1, Math.min(size, 100));
        int safePage = Math.max(0, page);

        return HostReservationsPageResponse.builder()
                .content(List.of())
                .page(safePage)
                .size(safeSize)
                .totalElements(0)
                .totalPages(1)
                .stats(HostReservationsPageResponse.ReservationStats.builder()
                        .total(0)
                        .pending(0)
                        .arrivalsToday(0)
                        .inHouse(0)
                        .revenue(0)
                        .currency("USD")
                        .build())
                .statusCounts(Map.of(
                        "ALL", 0L,
                        "NEEDS_ATTENTION", 0L,
                        "CONFIRMED", 0L,
                        "IN_HOUSE", 0L,
                        "CHECKED_OUT", 0L,
                        "COMPLETED", 0L,
                        "CANCELLED", 0L
                ))
                .occupiedDates(List.of())
                .nextReservations(List.of())
                .build();
    }

    private Map<UUID, PublicUserResponse> fetchGuestProfiles(List<Booking> bookings) {
        /*
         * Tách loading guest profile khỏi mapping để tránh gọi User Service lặp lại nhiều lần cho cùng
         * một guest trong cùng response. Đây không phải batch API thật, nhưng vẫn giảm N+1 rõ rệt so với
         * cách map từng booking rồi fetch ngay trong lambda.
         */
        Set<UUID> guestIds = bookings.stream()
                .map(Booking::getGuestId)
                .collect(Collectors.toCollection(HashSet::new));

        Map<UUID, PublicUserResponse> guestMap = new java.util.HashMap<>();
        guestIds.forEach(guestId -> guestMap.put(guestId, fetchGuestProfile(guestId)));
        return guestMap;
    }

    private boolean reservationMatchesQuery(
            ReservationResponse reservation,
            List<BookingStatus> statuses,
            String search,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        if (statuses != null && !statuses.isEmpty() && !statuses.contains(reservation.getStatus())) {
            return false;
        }

        // Date range dùng rule "stay overlap" giống frontend cũ:
        // checkout trước from hoặc checkin sau to thì nằm ngoài range.
        if (dateFrom != null && reservation.getCheckOutDate().isBefore(dateFrom)) {
            return false;
        }
        if (dateTo != null && reservation.getCheckInDate().isAfter(dateTo)) {
            return false;
        }

        String normalizedSearch = search == null ? "" : search.trim().toLowerCase();
        if (normalizedSearch.isBlank()) {
            return true;
        }

        String searchable = java.util.stream.Stream.of(
                        reservation.getReservationCode(),
                        reservation.getListingTitle(),
                        reservation.getListingCity(),
                        reservation.getListingCountry(),
                        reservation.getGuest() != null ? reservation.getGuest().getFullName() : null,
                        reservation.getStatusDisplayName()
                )
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.joining(" "))
                .toLowerCase();

        return searchable.contains(normalizedSearch);
    }

    private List<ReservationResponse> sortReservationResponses(List<ReservationResponse> reservations) {
        return reservations.stream()
                .sorted(Comparator
                        .comparingInt(this::reservationPriority)
                        .thenComparing(ReservationResponse::getCheckInDate)
                        .thenComparing(ReservationResponse::getCreatedAt, Comparator.reverseOrder()))
                .toList();
    }

    private int reservationPriority(ReservationResponse reservation) {
        LocalDate today = LocalDate.now();

        if (reservation.getStatus() == BookingStatus.PENDING_PAYMENT) return 0;
        if (reservation.getStatus() == BookingStatus.CHECKED_IN) return 1;
        if (reservation.getStatus() == BookingStatus.CONFIRMED && reservation.getCheckInDate().isEqual(today)) return 2;
        if (reservation.getStatus() == BookingStatus.CONFIRMED) return 3;
        if (reservation.getStatus() == BookingStatus.CHECKED_OUT) return 4;
        if (reservation.getStatus() == BookingStatus.COMPLETED) return 5;
        return 6;
    }

    private HostReservationsPageResponse.ReservationStats buildReservationStats(List<ReservationResponse> scopedReservations) {
        LocalDate today = LocalDate.now();
        long revenue = scopedReservations.stream()
                .filter(reservation -> reservation.getStatus() == BookingStatus.CONFIRMED
                        || reservation.getStatus() == BookingStatus.CHECKED_IN
                        || reservation.getStatus() == BookingStatus.CHECKED_OUT
                        || reservation.getStatus() == BookingStatus.COMPLETED)
                .mapToLong(ReservationResponse::getTotalAmount)
                .sum();

        return HostReservationsPageResponse.ReservationStats.builder()
                .total(scopedReservations.size())
                .pending(scopedReservations.stream()
                        .filter(reservation -> reservation.getStatus() == BookingStatus.PENDING_PAYMENT)
                        .count())
                .arrivalsToday(scopedReservations.stream()
                        .filter(reservation -> reservation.getCheckInDate().isEqual(today)
                                && (reservation.getStatus() == BookingStatus.CONFIRMED
                                || reservation.getStatus() == BookingStatus.CHECKED_IN))
                        .count())
                .inHouse(scopedReservations.stream()
                        .filter(reservation -> reservation.getStatus() == BookingStatus.CHECKED_IN)
                        .count())
                .revenue(revenue)
                .currency(scopedReservations.isEmpty() ? "USD" : scopedReservations.getFirst().getCurrency())
                .build();
    }

    private Map<String, Long> buildStatusCounts(List<ReservationResponse> scopedReservations) {
        /*
         * Count theo tab không bị ảnh hưởng bởi search/date hiện tại để giữ đúng behavior cũ.
         * Nếu count theo filtered result, user sẽ thấy số trên tab thay đổi khi gõ search và dễ hiểu
         * nhầm là scope listing đã mất reservation.
         */
        return Map.of(
                "ALL", (long) scopedReservations.size(),
                "NEEDS_ATTENTION", countStatuses(scopedReservations, BookingStatus.PENDING_PAYMENT),
                "CONFIRMED", countStatuses(scopedReservations, BookingStatus.CONFIRMED),
                "IN_HOUSE", countStatuses(scopedReservations, BookingStatus.CHECKED_IN),
                "CHECKED_OUT", countStatuses(scopedReservations, BookingStatus.CHECKED_OUT),
                "COMPLETED", countStatuses(scopedReservations, BookingStatus.COMPLETED),
                "CANCELLED", countStatuses(
                        scopedReservations,
                        BookingStatus.CANCELLED_BY_GUEST,
                        BookingStatus.CANCELLED_BY_HOST,
                        BookingStatus.CANCELLED_BY_ADMIN,
                        BookingStatus.EXPIRED
                )
        );
    }

    private long countStatuses(List<ReservationResponse> reservations, BookingStatus... statuses) {
        Set<BookingStatus> acceptedStatuses = Set.of(statuses);
        return reservations.stream()
                .filter(reservation -> acceptedStatuses.contains(reservation.getStatus()))
                .count();
    }

    private List<LocalDate> buildOccupiedDates(List<ReservationResponse> filteredReservations) {
        List<LocalDate> dates = new ArrayList<>();

        filteredReservations.stream()
                .filter(reservation -> !isCancelledStatus(reservation.getStatus())
                        && reservation.getStatus() != BookingStatus.EXPIRED)
                .forEach(reservation -> {
                    LocalDate cursor = reservation.getCheckInDate();
                    int guard = 0;
                    while (cursor.isBefore(reservation.getCheckOutDate()) && guard < 60) {
                        dates.add(cursor);
                        cursor = cursor.plusDays(1);
                        guard += 1;
                    }
                });

        return dates;
    }

    private List<ReservationResponse> buildNextReservations(List<ReservationResponse> filteredReservations) {
        LocalDate today = LocalDate.now();

        return filteredReservations.stream()
                .filter(reservation -> !isCancelledStatus(reservation.getStatus())
                        && reservation.getStatus() != BookingStatus.EXPIRED
                        && reservation.getStatus() != BookingStatus.COMPLETED
                        && !reservation.getCheckOutDate().isBefore(today))
                .limit(4)
                .toList();
    }

    private BookingResponse mapToResponse(Booking booking) {
        long secondsUntilExpiry = 0;
        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT && booking.getExpiresAt() != null) {
            secondsUntilExpiry = Math.max(0, ChronoUnit.SECONDS.between(LocalDateTime.now(), booking.getExpiresAt()));
        }

        return BookingResponse.builder()
                .id(booking.getBookingId())
                .roomId(booking.getListingId())
                .userId(booking.getGuestId())
                .hostId(booking.getHostId())
                .checkInDate(booking.getCheckInDate())
                .checkOutDate(booking.getCheckOutDate())
                .totalNights(booking.getTotalNights())
                .totalAmount(booking.getTotalPrice())
                .currency(booking.getCurrency())
                .status(booking.getStatus())
                .statusDisplayName(BookingResponse.getStatusDisplayName(booking.getStatus()))
                .paymentIntentId(booking.getPaymentIntentId())
                .createdAt(booking.getCreatedAt())
                .expiresAt(booking.getExpiresAt())
                .paidAt(booking.getPaidAt())
                .checkedInAt(booking.getCheckedInAt())
                .checkedOutAt(booking.getCheckedOutAt())
                .completedAt(booking.getCompletedAt())
                .cancelledAt(booking.getCancelledAt())
                .guestCount(booking.getNumAdults())
                .guestNotes(booking.getGuestNotes())
                .secondsUntilExpiry(secondsUntilExpiry)
                .build();
    }

    private BookingTripResponse mapToTripResponse(Booking booking, ListingResponse listing) {
        return BookingTripResponse.builder()
                .bookingId(booking.getBookingId())
                .listingId(booking.getListingId())
                .hostId(booking.getHostId())
                .checkInDate(booking.getCheckInDate())
                .checkOutDate(booking.getCheckOutDate())
                .totalNights(booking.getTotalNights())
                .totalAmount(booking.getTotalPrice())
                .currency(booking.getCurrency())
                .status(booking.getStatus())
                .statusDisplayName(BookingResponse.getStatusDisplayName(booking.getStatus()))
                .createdAt(booking.getCreatedAt())
                .expiresAt(booking.getExpiresAt())
                .paidAt(booking.getPaidAt())
                .checkedOutAt(booking.getCheckedOutAt())
                .numAdults(booking.getNumAdults())
                .numChildren(booking.getNumChildren())
                .numInfants(booking.getNumInfants())
                .numPets(booking.getNumPets())
                .title(listing != null ? listing.getTitle() : null)
                .city(listing != null ? listing.getCity() : null)
                .country(listing != null ? listing.getCountry() : null)
                .basePrice(listing != null && listing.getPricing() != null
                        ? listing.getPricing().getBasePrice().longValue()
                        : null)
                .coverImageUrl(resolveCoverImage(listing))
                .tripLabel(resolveTripLabel(booking))
                .build();
    }

    private GuestCancellationQuoteResponse mapToGuestCancellationQuoteResponse(BookingCancellationQuote quote) {
        return GuestCancellationQuoteResponse.builder()
                .quoteId(quote.getQuoteId())
                .bookingId(quote.getBookingId())
                .refundAmount(quote.getRefundAmount())
                .nonRefundableAmount(quote.getNonRefundableAmount())
                .accommodationRefund(quote.getAccommodationRefund())
                .cleaningFeeRefund(quote.getCleaningFeeRefund())
                .serviceFeeRefund(quote.getServiceFeeRefund())
                .taxesRefund(quote.getTaxesRefund())
                .currency(quote.getCurrency())
                .policyCode(quote.getPolicyCode())
                .expiresAt(quote.getExpiresAt())
                .build();
    }

    private HostCancellationQuoteResponse mapToHostCancellationQuoteResponse(HostCancellationQuote quote) {
        return HostCancellationQuoteResponse.builder()
                .quoteId(quote.getQuoteId())
                .bookingId(quote.getBookingId())
                .reasonCode(quote.getReasonCode())
                .guestRefundAmount(quote.getGuestRefundAmount())
                .currency(quote.getCurrency())
                .penaltyPoints(quote.getPenaltyPoints())
                .thresholdResult(HostCancellationQuoteResponse.ThresholdResult.builder()
                        .listingActivePenaltyCount(quote.getListingActivePenaltyCount())
                        .hostActivePenaltyCount(quote.getHostActivePenaltyCount())
                        .willSuspendListing(quote.getWillSuspendListing())
                        .listingSuspendedUntil(quote.getListingSuspendedUntil())
                        .willMarkHostAdminReview(quote.getWillMarkHostAdminReview())
                        .build())
                .expiresAt(quote.getExpiresAt())
                .build();
    }

    private ReservationResponse mapToReservationResponse(
            Booking booking,
            ListingResponse listing,
            PublicUserResponse guest
    ) {
        // Mapping list card: kết hợp dữ liệu Booking với listing/guest summary để frontend không cần gọi detail cho từng row.
        return ReservationResponse.builder()
                .reservationId(booking.getBookingId())
                .reservationCode(buildReservationCode(booking.getBookingId()))
                .listingId(booking.getListingId())
                .hostId(booking.getHostId())
                .guestId(booking.getGuestId())
                .guest(mapGuestSummary(booking.getGuestId(), guest))
                .listingTitle(listing != null ? listing.getTitle() : null)
                .listingCity(listing != null ? listing.getCity() : null)
                .listingCountry(listing != null ? listing.getCountry() : null)
                .listingCoverImageUrl(resolveCoverImage(listing))
                .checkInDate(booking.getCheckInDate())
                .checkOutDate(booking.getCheckOutDate())
                .totalNights(booking.getTotalNights())
                .totalAmount(booking.getTotalPrice())
                .currency(booking.getCurrency())
                .status(booking.getStatus())
                .statusDisplayName(BookingResponse.getStatusDisplayName(booking.getStatus()))
                .createdAt(booking.getCreatedAt())
                .expiresAt(booking.getExpiresAt())
                .paidAt(booking.getPaidAt())
                .checkedInAt(booking.getCheckedInAt())
                .checkedOutAt(booking.getCheckedOutAt())
                .completedAt(booking.getCompletedAt())
                .cancelledAt(booking.getCancelledAt())
                .numAdults(booking.getNumAdults())
                .numChildren(booking.getNumChildren())
                .numInfants(booking.getNumInfants())
                .numPets(booking.getNumPets())
                .guestNotes(booking.getGuestNotes())
                .build();
    }

    private ReservationDetailResponse mapToReservationDetailResponse(
            Booking booking,
            ListingResponse listing,
            PublicUserResponse guest
    ) {
        // Mapping detail: dữ liệu Booking là nguồn truth, còn listing/guest/payment là enrichment phục vụ UI host dashboard.
        return ReservationDetailResponse.builder()
                .reservationId(booking.getBookingId())
                .reservationCode(buildReservationCode(booking.getBookingId()))
                .listingId(booking.getListingId())
                .hostId(booking.getHostId())
                .guestId(booking.getGuestId())
                .checkInDate(booking.getCheckInDate())
                .checkOutDate(booking.getCheckOutDate())
                .totalNights(booking.getTotalNights())
                .status(booking.getStatus())
                .statusDisplayName(BookingResponse.getStatusDisplayName(booking.getStatus()))
                .currency(booking.getCurrency())
                .totalAmount(booking.getTotalPrice())
                .paymentIntentId(booking.getPaymentIntentId())
                .createdAt(booking.getCreatedAt())
                .expiresAt(booking.getExpiresAt())
                .paidAt(booking.getPaidAt())
                .checkedInAt(booking.getCheckedInAt())
                .checkedOutAt(booking.getCheckedOutAt())
                .completedAt(booking.getCompletedAt())
                .cancelledAt(booking.getCancelledAt())
                .cancellationReason(booking.getCancellationReason())
                .numAdults(booking.getNumAdults())
                .numChildren(booking.getNumChildren())
                .numInfants(booking.getNumInfants())
                .numPets(booking.getNumPets())
                .guestNotes(booking.getGuestNotes())
                .listing(mapReservationListingSummary(listing))
                .guest(mapGuestSummary(booking.getGuestId(), guest))
                .payment(mapReservationPaymentSummary(booking))
                .build();
    }

    private ReservationResponse.GuestSummary mapGuestSummary(UUID fallbackGuestId, PublicUserResponse guest) {
        // User Service có thể lỗi hoặc thiếu profile; fallback vẫn giúp UI render được reservation thay vì fail toàn bộ response.
        if (guest == null) {
            return ReservationResponse.GuestSummary.builder()
                    .keycloakUserId(fallbackGuestId != null ? fallbackGuestId.toString() : null)
                    .fullName("Guest")
                    .build();
        }

        return ReservationResponse.GuestSummary.builder()
                .userId(guest.getUserId())
                .keycloakUserId(guest.getKeycloakUserId())
                .fullName(guest.getFullName())
                .avatarUrl(guest.getAvatarUrl())
                .build();
    }

    private ReservationDetailResponse.ListingSummary mapReservationListingSummary(ListingResponse listing) {
        if (listing == null) {
            return null;
        }

        return ReservationDetailResponse.ListingSummary.builder()
                .listingId(listing.getListingId())
                .title(listing.getTitle())
                .description(listing.getDescription())
                .propertyType(listing.getPropertyType())
                .roomType(listing.getRoomType())
                .address(listing.getAddress())
                .city(listing.getCity())
                .state(listing.getState())
                .country(listing.getCountry())
                .postalCode(listing.getPostalCode())
                .latitude(listing.getLatitude())
                .longitude(listing.getLongitude())
                .maxGuests(listing.getMaxGuests())
                .numBedrooms(listing.getNumBedrooms())
                .numBeds(listing.getNumBeds())
                .numBathrooms(listing.getNumBathrooms())
                .checkInStartTime(listing.getCheckInStartTime())
                .checkInEndTime(listing.getCheckInEndTime())
                .checkOutTime(listing.getCheckOutTime())
                .photos(listing.getPhotos())
                .amenities(listing.getAmenities())
                .houseRules(listing.getHouseRules())
                .build();
    }

    private ReservationDetailResponse.PaymentSummary mapReservationPaymentSummary(Booking booking) {
        return ReservationDetailResponse.PaymentSummary.builder()
                .totalAmount(BigDecimal.valueOf(booking.getTotalPrice()))
                .accommodationAmount(snapshotAmount(booking.getAccommodationSubtotal()))
                .cleaningFee(snapshotAmount(booking.getCleaningFee()))
                .serviceFee(snapshotAmount(booking.getServiceFee()))
                .taxes(snapshotAmount(booking.getTaxes()))
                .currency(booking.getCurrency())
                .stripePaymentIntentId(booking.getPaymentIntentId())
                .stripePaymentStatus(resolveStripeStatus(booking))
                .build();
    }

    private BookingDetailResponse mapToDetailResponse(
            Booking booking,
            ListingResponse listing,
            PublicUserResponse host
    ) {
        return BookingDetailResponse.builder()
                .bookingId(booking.getBookingId())
                .reservationCode(buildReservationCode(booking.getBookingId()))
                .listingId(booking.getListingId())
                .guestId(booking.getGuestId())
                .hostId(booking.getHostId())
                .checkInDate(booking.getCheckInDate())
                .checkOutDate(booking.getCheckOutDate())
                .totalNights(booking.getTotalNights())
                .status(booking.getStatus())
                .statusDisplayName(BookingResponse.getStatusDisplayName(booking.getStatus()))
                .currency(booking.getCurrency())
                .createdAt(booking.getCreatedAt())
                .expiresAt(booking.getExpiresAt())
                .paidAt(booking.getPaidAt())
                .checkedInAt(booking.getCheckedInAt())
                .checkedOutAt(booking.getCheckedOutAt())
                .completedAt(booking.getCompletedAt())
                .paymentIntentId(booking.getPaymentIntentId())
                .numAdults(booking.getNumAdults())
                .numChildren(booking.getNumChildren())
                .numInfants(booking.getNumInfants())
                .numPets(booking.getNumPets())
                .guestNotes(booking.getGuestNotes())
                .listing(mapListingSummary(listing))
                .host(mapHostSummary(booking.getHostId(), host))
                .accessInfo(buildAccessInfo(listing))
                .payment(buildPaymentSummary(booking))
                .cancellationPolicy(buildCancellationPolicy(booking))
                .reviewSummary(buildReviewSummary(booking))
                .build();
    }

    private BookingDetailResponse.ListingStaySummary mapListingSummary(ListingResponse listing) {
        if (listing == null) {
            return null;
        }

        return BookingDetailResponse.ListingStaySummary.builder()
                .listingId(listing.getListingId())
                .title(listing.getTitle())
                .description(listing.getDescription())
                .propertyType(listing.getPropertyType())
                .roomType(listing.getRoomType())
                .address(listing.getAddress())
                .city(listing.getCity())
                .state(listing.getState())
                .country(listing.getCountry())
                .postalCode(listing.getPostalCode())
                .latitude(listing.getLatitude())
                .longitude(listing.getLongitude())
                .maxGuests(listing.getMaxGuests())
                .numBedrooms(listing.getNumBedrooms())
                .numBeds(listing.getNumBeds())
                .numBathrooms(listing.getNumBathrooms())
                .checkInStartTime(listing.getCheckInStartTime())
                .checkInEndTime(listing.getCheckInEndTime())
                .checkOutTime(listing.getCheckOutTime())
                .photos(listing.getPhotos())
                .amenities(listing.getAmenities())
                .houseRules(listing.getHouseRules())
                .build();
    }

    private BookingDetailResponse.HostSummary mapHostSummary(UUID fallbackHostId, PublicUserResponse host) {
        if (host == null) {
            return BookingDetailResponse.HostSummary.builder()
                    .keycloakUserId(fallbackHostId != null ? fallbackHostId.toString() : null)
                    .fullName("Host")
                    .superHost(false)
                    .build();
        }

        return BookingDetailResponse.HostSummary.builder()
                .keycloakUserId(host.getKeycloakUserId())
                .userId(host.getUserId())
                .fullName(host.getFullName())
                .avatarUrl(host.getAvatarUrl())
                .superHost(Boolean.TRUE.equals(host.getSuperHost()))
                .joinedAt(host.getJoinedAt())
                .build();
    }

    private BookingDetailResponse.CancellationPolicy buildCancellationPolicy(Booking booking) {
        boolean refundable = booking.getStatus() == BookingStatus.CONFIRMED
                || booking.getStatus() == BookingStatus.PENDING_PAYMENT;

        return BookingDetailResponse.CancellationPolicy.builder()
                .type(refundable ? booking.getCancellationPolicyCode() : "Not refundable")
                .description(refundable
                        ? "Cancel before check-in to request a refund according to the host policy."
                        : "This reservation is no longer eligible for automatic refund.")
                .refundable(refundable)
                .build();
    }

    private BookingDetailResponse.ReviewSummary buildReviewSummary(Booking booking) {
        int seed = Math.abs(booking.getListingId().hashCode());
        BigDecimal averageRating = BigDecimal.valueOf(4.6 + (seed % 35) / 100.0)
                .setScale(2, java.math.RoundingMode.HALF_UP);

        return BookingDetailResponse.ReviewSummary.builder()
                .averageRating(averageRating)
                .reviewCount(12 + seed % 140)
                .build();
    }

    private BookingDetailResponse.AccessInfo buildAccessInfo(ListingResponse listing) {
        return BookingDetailResponse.AccessInfo.builder()
                .wifiPassword(null)
                .entryCode(null)
                .smartLockInstructions(null)
                .keyPickupInstructions(null)
                .checkInGuide(buildCheckInGuide(listing))
                .build();
    }

    private List<BookingDetailResponse.GuideStep> buildCheckInGuide(ListingResponse listing) {
        if (listing == null) {
            return List.of();
        }

        return List.of(
                BookingDetailResponse.GuideStep.builder()
                        .stepNumber(1)
                        .title("Confirm your arrival window")
                        .description("Check in from " + formatTime(listing.getCheckInStartTime())
                                + (listing.getCheckInEndTime() != null ? " to " + formatTime(listing.getCheckInEndTime()) : "") + ".")
                        .imageUrl(resolveCoverImage(listing))
                        .build(),
                BookingDetailResponse.GuideStep.builder()
                        .stepNumber(2)
                        .title("Use the listing address")
                        .description(buildFullAddress(listing))
                        .imageUrl(null)
                        .build()
        );
    }

    private BookingDetailResponse.PaymentSummary buildPaymentSummary(Booking booking) {
        return BookingDetailResponse.PaymentSummary.builder()
                .totalAmount(BigDecimal.valueOf(booking.getTotalPrice()))
                .accommodationAmount(snapshotAmount(booking.getAccommodationSubtotal()))
                .cleaningFee(snapshotAmount(booking.getCleaningFee()))
                .serviceFee(snapshotAmount(booking.getServiceFee()))
                .taxes(snapshotAmount(booking.getTaxes()))
                .currency(booking.getCurrency())
                .refundPolicy(resolveRefundPolicy(booking))
                .stripePaymentIntentId(booking.getPaymentIntentId())
                .stripePaymentStatus(resolveStripeStatus(booking))
                .build();
    }

    private PublicUserResponse fetchHostProfile(UUID hostId) {
        if (hostId == null) {
            return null;
        }

        try {
            return userClient.getPublicUser(hostId.toString());
        } catch (Exception exception) {
            log.warn("Failed to fetch host profile for {}", hostId, exception);
            return null;
        }
    }

    private PublicUserResponse fetchGuestProfile(UUID guestId) {
        if (guestId == null) {
            return null;
        }

        try {
            return userClient.getPublicUser(guestId.toString());
        } catch (Exception exception) {
            log.warn("Failed to fetch guest profile for {}", guestId, exception);
            return null;
        }
    }

    private List<Booking> findReservationsForListing(
            UUID listingId,
            UUID hostId,
            List<BookingStatus> statuses
    ) {
        // hostId null nghĩa là admin scope: query chỉ theo listing/status.
        // host scope phải thêm hostId để không lộ reservation của listing khác.
        boolean hasStatuses = statuses != null && !statuses.isEmpty();
        if (hostId == null) {
            return hasStatuses
                    ? bookingRepository.findByListingIdAndStatusInOrderByCheckInDateDescCreatedAtDesc(listingId, statuses)
                    : bookingRepository.findByListingIdOrderByCheckInDateDescCreatedAtDesc(listingId);
        }

        return hasStatuses
                ? bookingRepository.findByListingIdAndHostIdAndStatusInOrderByCheckInDateDescCreatedAtDesc(listingId, hostId, statuses)
                : bookingRepository.findByListingIdAndHostIdOrderByCheckInDateDescCreatedAtDesc(listingId, hostId);
    }

    private void ensureCanManageReservation(Jwt jwt, Booking booking) {
        // Quyền quản lý reservation: admin được phép toàn cục, host chỉ được phép với booking có hostId trùng subject JWT.
        if (isAdmin(jwt)) {
            return;
        }

        if (booking.getHostId() == null || !booking.getHostId().toString().equals(jwt.getSubject())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot manage this reservation");
        }
    }

    private void validateReservationManagementStatus(BookingStatus status) {
        // CONFIRMED/EXPIRED thuộc payment/expiry flow, không cho host tự set từ dashboard để tránh lệch với Stripe/webhook.
        if (status == BookingStatus.CONFIRMED || status == BookingStatus.EXPIRED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Reservation management cannot set payment-owned status: " + status
            );
        }
    }

    private boolean isAdmin(Jwt jwt) {
        // Realm role có thể được cấu hình dạng ADMIN hoặc ROLE_ADMIN tùy Keycloak/client.
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        Object rolesClaim = realmAccess != null ? realmAccess.get("roles") : List.of();

        if (!(rolesClaim instanceof Collection<?> roles)) {
            return false;
        }

        return roles.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals("ADMIN") || role.equals("ROLE_ADMIN"));
    }

    private String buildReservationCode(UUID bookingId) {
        // Mã ngắn phục vụ UI và trao đổi với guest/host; bookingId vẫn là khóa thật trong database.
        return "AIR-" + bookingId.toString().substring(0, 8).toUpperCase();
    }

    private String buildFullAddress(ListingResponse listing) {
        return java.util.stream.Stream.of(
                        listing.getAddress(),
                        listing.getCity(),
                        listing.getState(),
                        listing.getCountry(),
                        listing.getPostalCode()
                )
                .filter(value -> value != null && !value.isBlank())
                .collect(java.util.stream.Collectors.joining(", "));
    }

    private String formatTime(java.time.LocalTime time) {
        return time != null ? time.toString() : "the host's check-in time";
    }

    private String resolveRefundPolicy(Booking booking) {
        return booking.getStatus() == BookingStatus.PENDING_PAYMENT
                ? "Payment is still pending. Complete payment before the booking expires."
                : "Refund eligibility depends on the host cancellation policy and trip timing.";
    }

    private String resolveStripeStatus(Booking booking) {
        if (booking.getPaymentIntentId() == null || booking.getPaymentIntentId().isBlank()) {
            return booking.getStatus() == BookingStatus.PENDING_PAYMENT ? "PAYMENT_PENDING" : null;
        }

        return switch (booking.getStatus()) {
            case CONFIRMED, CHECKED_IN, CHECKED_OUT, COMPLETED -> "PAID";
            case PENDING_PAYMENT -> "PAYMENT_PENDING";
            case EXPIRED -> "PAYMENT_CANCELLED";
            case CANCELLED_BY_GUEST, CANCELLED_BY_HOST, CANCELLED_BY_ADMIN -> "REFUND_PENDING";
        };
    }

    private String resolveTripLabel(Booking booking) {
        LocalDate today = LocalDate.now();
        if (isCancelledStatus(booking.getStatus())) return "Cancelled trip";
        if (booking.getStatus() == BookingStatus.CHECKED_IN) return "Ongoing trip";
        if (booking.getStatus() == BookingStatus.CHECKED_OUT) return "Checked-out trip";
        if (booking.getStatus() == BookingStatus.COMPLETED) return "Past trip";
        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            return booking.getCheckInDate().isAfter(today) ? "Upcoming trip" : "Ongoing trip";
        }
        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) return "Waiting for payment";
        return "Trip";
    }

    private String resolveCoverImage(ListingResponse listing) {
        if (listing == null || listing.getPhotos() == null || listing.getPhotos().isEmpty()) {
            return null;
        }
        return listing.getPhotos().stream()
                .filter(photo -> Boolean.TRUE.equals(photo.getIsCover()))
                .map(photo -> photo.getPhotoUrl())
                .findFirst()
                .orElseGet(() -> listing.getPhotos().getFirst().getPhotoUrl());
    }

    private Jwt currentJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return (Jwt) authentication.getPrincipal();
    }
}
