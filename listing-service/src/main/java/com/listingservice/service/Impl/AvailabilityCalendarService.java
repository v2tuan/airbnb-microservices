package com.listingservice.service.Impl;

import com.listingservice.constant.ListingStatus;
import com.listingservice.dto.request.AvailabilityRequest;
import com.listingservice.dto.response.AvailabilityResponse;
import com.listingservice.dto.response.DailyAvailabilityResponse;
import com.listingservice.dto.response.ListingAvailabilityCheckResponse;
import com.listingservice.entity.AvailabilityCalendar;
import com.listingservice.entity.Listing;
import com.listingservice.exception.AppException;
import com.listingservice.exception.ErrorCode;
import com.listingservice.mapper.IAvailabilityCalendarMapper;
import com.listingservice.repository.AvailabilityCalendarRepository;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.AvailabilityClient;
import com.listingservice.service.IAvailabilityCalendarService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AvailabilityCalendarService implements IAvailabilityCalendarService {
    
    AvailabilityCalendarRepository availabilityCalendarRepository;
    ListingRepository listingRepository;
    IAvailabilityCalendarMapper availabilityCalendarMapper;
    AvailabilityClient availabilityClient;
    
    @Override
    @Transactional
    public AvailabilityResponse setAvailability(UUID listingId, AvailabilityRequest request) {
        log.info("Setting availability for listing: {} on date: {}", listingId, request.getDate());
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        AvailabilityCalendar availability = availabilityCalendarRepository
                .findByListingListingIdAndDate(listingId, request.getDate())
                .orElse(AvailabilityCalendar.builder()
                        .listing(listing)
                        .date(request.getDate())
                        .build());
        
        availabilityCalendarMapper.updateEntity(availability, request);
        
        AvailabilityCalendar savedAvailability = availabilityCalendarRepository.save(availability);
        log.info("Availability set for listing: {} on date: {}", listingId, request.getDate());
        
        return availabilityCalendarMapper.toResponse(savedAvailability);
    }
    
    @Override
    public List<AvailabilityResponse> getAvailability(UUID listingId, LocalDate startDate, LocalDate endDate) {
        log.info("Getting availability for listing: {} between {} and {}", listingId, startDate, endDate);

        if (!listingRepository.existsById(listingId)) {
            throw new AppException(ErrorCode.LISTING_NOT_FOUND);
        }

        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            return List.of();
        }

        Map<LocalDate, AvailabilityCalendar> availabilityByDate = availabilityCalendarRepository
                .findByListingListingIdAndDateBetween(listingId, startDate, endDate)
                .stream()
                .collect(Collectors.toMap(
                        AvailabilityCalendar::getDate,
                        row -> row,
                        (left, right) -> left
                ));

        List<AvailabilityResponse> results = new ArrayList<>();
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            AvailabilityCalendar calendar = availabilityByDate.get(currentDate);
            if (calendar != null) {
                results.add(availabilityCalendarMapper.toResponse(calendar));
            } else {
                results.add(AvailabilityResponse.builder()
                        .listingId(listingId)
                        .date(currentDate)
                        .isAvailable(false)
                        .build());
            }
            currentDate = currentDate.plusDays(1);
        }

        return results;
    }
    
    @Override
    public boolean checkAvailability(UUID listingId, LocalDate startDate, LocalDate endDate) {
        log.info("Checking availability for listing: {} between {} and {}", listingId, startDate, endDate);
        
        if (!listingRepository.existsById(listingId)) {
            throw new AppException(ErrorCode.LISTING_NOT_FOUND);
        }
        
        boolean isAvailable = !availabilityCalendarRepository.hasBlockedDateInRange(
                listingId, startDate, endDate
        );
        
        log.info("Availability check result: {}", isAvailable);
        return isAvailable;
    }

    @Override
    @Transactional(readOnly = true)
    public ListingAvailabilityCheckResponse checkBookableAvailability(UUID listingId, LocalDate checkIn, LocalDate checkOut) {
        log.info("Checking bookable availability for listing: {} from {} to {}", listingId, checkIn, checkOut);

        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));

        List<String> rangeReasons = new ArrayList<>();
        List<String> globalDailyReasons = new ArrayList<>();
        long nights = 0;

        if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
            rangeReasons.add("INVALID_DATE_RANGE");
            return buildBookableResponse(listingId, checkIn, checkOut, nights, List.of(), rangeReasons);
        }

        nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        long stayNights = nights;

        if (checkIn.isBefore(LocalDate.now())) {
            rangeReasons.add("PAST_DATE_RANGE");
        }

        if (listing.getStatus() == ListingStatus.SUSPENDED
                || listing.getSuspendedUntil() != null && listing.getSuspendedUntil().isAfter(LocalDateTime.now())) {
            rangeReasons.add("LISTING_SUSPENDED");
            globalDailyReasons.add("LISTING_SUSPENDED");
        } else if (listing.getStatus() != ListingStatus.ACTIVE) {
            rangeReasons.add("LISTING_NOT_ACTIVE");
            globalDailyReasons.add("LISTING_NOT_ACTIVE");
        }

        // Booking uses a checkout-exclusive date range: [checkIn, checkOut).
        // Calendar rows should therefore be checked only for actual stay nights.
        LocalDate lastStayDate = checkOut.minusDays(1);
        List<AvailabilityCalendar> calendarRows = availabilityCalendarRepository
                .findByListingListingIdAndDateBetween(listingId, checkIn, lastStayDate);
        Map<LocalDate, AvailabilityCalendar> calendarByDate = calendarRows.stream()
                .collect(Collectors.toMap(
                        AvailabilityCalendar::getDate,
                        row -> row,
                        (left, right) -> left
                ));

        boolean minNightsNotMet = calendarRows.stream()
                .anyMatch(row -> row.getMinNights() != null && stayNights < row.getMinNights());
        if (minNightsNotMet) {
            rangeReasons.add("MIN_NIGHTS_NOT_MET");
        }

        boolean maxNightsExceeded = calendarRows.stream()
                .anyMatch(row -> row.getMaxNights() != null && stayNights > row.getMaxNights());
        if (maxNightsExceeded) {
            rangeReasons.add("MAX_NIGHTS_EXCEEDED");
        }

        AvailabilityClient.BookingUnavailableDatesResult bookingUnavailableDates =
                availabilityClient.getUnavailableDates(listingId, checkIn, checkOut);
        Set<LocalDate> bookingUnavailableDateSet = new HashSet<>(bookingUnavailableDates.unavailableDates());
        if (!bookingUnavailableDates.serviceAvailable()) {
            rangeReasons.add("BOOKING_SERVICE_UNAVAILABLE");
            globalDailyReasons.add("BOOKING_SERVICE_UNAVAILABLE");
        }

        List<DailyAvailabilityResponse> dailyAvailability = buildDailyAvailability(
                checkIn,
                checkOut,
                calendarByDate,
                bookingUnavailableDateSet,
                globalDailyReasons
        );
        addDailyRangeReasons(rangeReasons, dailyAvailability);

        return buildBookableResponse(listingId, checkIn, checkOut, nights, dailyAvailability, rangeReasons);
    }

    private ListingAvailabilityCheckResponse buildBookableResponse(
            UUID listingId,
            LocalDate checkIn,
            LocalDate checkOut,
            long nights,
            List<DailyAvailabilityResponse> dailyAvailability,
            List<String> reasons
    ) {
        boolean available = reasons.isEmpty();
        List<LocalDate> availableDates = dailyAvailability.stream()
                .filter(day -> Boolean.TRUE.equals(day.getAvailable()))
                .map(DailyAvailabilityResponse::getDate)
                .toList();
        List<LocalDate> unavailableDates = dailyAvailability.stream()
                .filter(day -> !Boolean.TRUE.equals(day.getAvailable()))
                .map(DailyAvailabilityResponse::getDate)
                .toList();

        return ListingAvailabilityCheckResponse.builder()
                .listingId(listingId)
                .checkIn(checkIn)
                .checkOut(checkOut)
                .nights(nights)
                .available(available)
                .availableDates(availableDates)
                .unavailableDates(unavailableDates)
                .dailyAvailability(List.copyOf(dailyAvailability))
                .reasons(List.copyOf(reasons))
                .message(buildBookableMessage(available, reasons, availableDates, unavailableDates))
                .build();
    }

    private List<DailyAvailabilityResponse> buildDailyAvailability(
            LocalDate checkIn,
            LocalDate checkOut,
            Map<LocalDate, AvailabilityCalendar> calendarByDate,
            Set<LocalDate> bookingUnavailableDates,
            List<String> globalReasons
    ) {
        List<DailyAvailabilityResponse> days = new ArrayList<>();
        LocalDate currentDate = checkIn;

        while (currentDate.isBefore(checkOut)) {
            List<String> dateReasons = new ArrayList<>(globalReasons);
            AvailabilityCalendar calendarRow = calendarByDate.get(currentDate);

            if (currentDate.isBefore(LocalDate.now())) {
                dateReasons.add("PAST_DATE");
            }
            if (calendarRow != null && Boolean.FALSE.equals(calendarRow.getIsAvailable())) {
                dateReasons.add("HOST_BLOCKED_DATE");
            }
            if (bookingUnavailableDates.contains(currentDate)) {
                dateReasons.add("BOOKING_CONFLICT");
            }

            days.add(DailyAvailabilityResponse.builder()
                    .date(currentDate)
                    .available(dateReasons.isEmpty())
                    .reasons(List.copyOf(dateReasons))
                    .build());

            currentDate = currentDate.plusDays(1);
        }

        return days;
    }

    private void addDailyRangeReasons(List<String> rangeReasons, List<DailyAvailabilityResponse> dailyAvailability) {
        boolean hasHostBlockedDate = dailyAvailability.stream()
                .anyMatch(day -> day.getReasons().contains("HOST_BLOCKED_DATE"));
        if (hasHostBlockedDate) {
            addReason(rangeReasons, "HOST_BLOCKED_DATE");
        }

        boolean hasBookingConflict = dailyAvailability.stream()
                .anyMatch(day -> day.getReasons().contains("BOOKING_CONFLICT"));
        if (hasBookingConflict) {
            addReason(rangeReasons, "BOOKING_CONFLICT");
        }

        boolean hasPastDate = dailyAvailability.stream()
                .anyMatch(day -> day.getReasons().contains("PAST_DATE"));
        if (hasPastDate) {
            addReason(rangeReasons, "PAST_DATE_RANGE");
        }

        long availableDateCount = dailyAvailability.stream()
                .filter(day -> Boolean.TRUE.equals(day.getAvailable()))
                .count();
        if (availableDateCount > 0 && availableDateCount < dailyAvailability.size()) {
            addReason(rangeReasons, "PARTIALLY_AVAILABLE");
        } else if (availableDateCount == 0 && !dailyAvailability.isEmpty()) {
            addReason(rangeReasons, "NO_DATES_AVAILABLE");
        }
    }

    private void addReason(List<String> reasons, String reason) {
        if (!reasons.contains(reason)) {
            reasons.add(reason);
        }
    }

    private String buildBookableMessage(
            boolean available,
            List<String> reasons,
            List<LocalDate> availableDates,
            List<LocalDate> unavailableDates
    ) {
        if (available) {
            return "Listing is available for the requested dates.";
        }

        if (reasons.contains("INVALID_DATE_RANGE")) {
            return "Check-out date must be after check-in date.";
        }
        if (reasons.contains("PAST_DATE_RANGE")) {
            return "Check-in date must be today or a future date.";
        }
        if (reasons.contains("LISTING_NOT_ACTIVE")) {
            return "Listing is not active.";
        }
        if (reasons.contains("LISTING_SUSPENDED")) {
            return "Listing is currently suspended.";
        }
        if (reasons.contains("BOOKING_SERVICE_UNAVAILABLE")) {
            return "Booking availability could not be verified at this time.";
        }
        if (reasons.contains("PARTIALLY_AVAILABLE")) {
            return "Listing is not available for the full range, but some stay dates are available.";
        }
        if (reasons.contains("NO_DATES_AVAILABLE")) {
            return "No stay dates are available in the requested range.";
        }
        if (reasons.contains("HOST_BLOCKED_DATE")) {
            return "The host has blocked at least one date in this range.";
        }
        if (reasons.contains("MIN_NIGHTS_NOT_MET")) {
            return "The selected stay is shorter than the listing minimum night rule.";
        }
        if (reasons.contains("MAX_NIGHTS_EXCEEDED")) {
            return "The selected stay is longer than the listing maximum night rule.";
        }
        if (reasons.contains("BOOKING_CONFLICT")) {
            return "The listing already has an active booking in this date range.";
        }
        if (!availableDates.isEmpty() && !unavailableDates.isEmpty()) {
            return "Listing is partially available in this date range.";
        }

        return "Listing is not available for the requested dates.";
    }
    
    @Override
    @Transactional
    public void blockDates(UUID listingId, LocalDate startDate, LocalDate endDate) {
        log.info("Blocking dates for listing: {} from {} to {}", listingId, startDate, endDate);
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            final LocalDate dateToBlock = currentDate;
            
            AvailabilityCalendar availability = availabilityCalendarRepository
                    .findByListingListingIdAndDate(listingId, dateToBlock)
                    .orElse(AvailabilityCalendar.builder()
                            .listing(listing)
                            .date(dateToBlock)
                            .build());
            
            availability.setIsAvailable(false);
            availabilityCalendarRepository.save(availability);
            
            currentDate = currentDate.plusDays(1);
        }
        
        log.info("Dates blocked successfully");
    }
    
    @Override
    @Transactional
    public void unblockDates(UUID listingId, LocalDate startDate, LocalDate endDate) {
        log.info("Unblocking dates for listing: {} from {} to {}", listingId, startDate, endDate);
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            final LocalDate dateToUnblock = currentDate;
            
            AvailabilityCalendar availability = availabilityCalendarRepository
                    .findByListingListingIdAndDate(listingId, dateToUnblock)
                    .orElse(AvailabilityCalendar.builder()
                            .listing(listing)
                            .date(dateToUnblock)
                            .build());
            
            availability.setIsAvailable(true);
            availabilityCalendarRepository.save(availability);
            
            currentDate = currentDate.plusDays(1);
        }
        
        log.info("Dates unblocked successfully");
    }
}
