package com.bookingservice.service;

import com.bookingservice.dto.request.BookingFilterType;
import com.bookingservice.dto.request.CreateBookingRequest;
import com.bookingservice.dto.request.ListingBatchRequest;
import com.bookingservice.dto.request.UpdateBookingStatusRequest;
import com.bookingservice.dto.response.BookingResponse;
import com.bookingservice.dto.response.BookingTripResponse;
import com.bookingservice.dto.response.CreateBookingResponse;
import com.bookingservice.dto.response.ListingResponse;
import com.bookingservice.entity.Booking;
import com.bookingservice.entity.BookingStatus;
import com.bookingservice.repository.BookingRepository;
import com.bookingservice.repository.client.ListingClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {
    private final BookingRepository bookingRepository;
    private final ListingClient listingClient;

    @Transactional
    public CreateBookingResponse createBooking(CreateBookingRequest request) {
        Jwt jwt = currentJwt();
        UUID guestId = UUID.fromString(jwt.getSubject());

        if (!request.getCheckOutDate().isAfter(request.getCheckInDate())) {
            throw new IllegalArgumentException("Check-out date must be after check-in date");
        }

        // Lock listing ngăn double booking
        bookingRepository.acquireListingBookingLock(request.getRoomId().toString());

        List<Booking> conflictingBookings = bookingRepository.findConflictingBookings(
                request.getRoomId(), request.getCheckInDate(), request.getCheckOutDate());
        if (!conflictingBookings.isEmpty()) {
            throw new IllegalStateException("Listing is not available for the selected dates");
        }

        ListingResponse listing = listingClient
                .getListingById("Bearer " + jwt.getTokenValue(), request.getRoomId())
                .getData();

        int totalNights = (int) ChronoUnit.DAYS.between(request.getCheckInDate(), request.getCheckOutDate());
        Booking booking = Booking.builder()
                .listingId(request.getRoomId())
                .hostId(UUID.fromString(listing.getHostId()))
                .guestId(guestId)
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .totalNights(totalNights)
                .totalPrice(totalNights * listing.getPricing().getBasePrice().longValue())
                .currency(request.getCurrency() != null ? request.getCurrency().toUpperCase() : "USD")
                .numAdults(request.getNumberOfAdults())
                .numChildren(request.getNumberOfChildren())
                .numInfants(request.getNumberOfInfants())
                .numPets(request.getNumberOfPets())
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
        if (request.getStatus() == BookingStatus.PAID) {
            booking.setPaidAt(LocalDateTime.now());
        }
        if (request.getStatus() == BookingStatus.CHECKED_IN) {
            booking.setCheckedInAt(LocalDateTime.now());
        }
        if (request.getStatus() == BookingStatus.COMPLETED) {
            booking.setCompletedAt(LocalDateTime.now());
        }
        if (request.getStatus() == BookingStatus.CANCELLED) {
            booking.setCancelledAt(LocalDateTime.now());
        }

        return mapToResponse(bookingRepository.save(booking));
    }

    @Transactional(readOnly = true)
    public BookingResponse getBooking(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .map(this::mapToResponse)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));
    }

    @Transactional
    public BookingResponse checkIn(UUID bookingId) {
        return updateBookingStatus(bookingId, UpdateBookingStatusRequest.builder()
                .status(BookingStatus.CHECKED_IN)
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
            case PENDING_PAYMENT -> newStatus == BookingStatus.PAID
                    || newStatus == BookingStatus.EXPIRED
                    || newStatus == BookingStatus.CANCELLED;
            case PAID -> newStatus == BookingStatus.CHECKED_IN
                    || newStatus == BookingStatus.CANCELLED;
            case CHECKED_IN -> newStatus == BookingStatus.COMPLETED
                    || newStatus == BookingStatus.CANCELLED;
            case EXPIRED, CANCELLED, COMPLETED -> false;
        };

        if (!isValid) {
            throw new IllegalStateException("Invalid booking transition from " + currentStatus + " to " + newStatus);
        }
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

    private String resolveTripLabel(Booking booking) {
        LocalDate today = LocalDate.now();
        if (booking.getStatus() == BookingStatus.CANCELLED) return "Cancelled trip";
        if (booking.getStatus() == BookingStatus.CHECKED_IN) return "Ongoing trip";
        if (booking.getStatus() == BookingStatus.COMPLETED) return "Past trip";
        if (booking.getStatus() == BookingStatus.PAID) {
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
