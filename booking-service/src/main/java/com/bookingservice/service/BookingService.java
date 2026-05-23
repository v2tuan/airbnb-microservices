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

    /**
     * Tạo booking mới với trạng thái PENDING_PAYMENT.
     *
     * QUAN TRỌNG: Booking được tạo NGAY LẬP TỨC khi user bấm "Đặt phòng",
     * KHÔNG đợi thanh toán thành công. Giống flow của Shopee/Tiki.
     *
     * @param request thông tin đặt phòng từ frontend
     * @return response chứa bookingId để tiếp tục flow thanh toán
     */
    public CreateBookingResponse createBooking(CreateBookingRequest request) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        Jwt jwt = (Jwt) authentication.getPrincipal();

        String userId = jwt.getSubject();

        log.info("Creating new booking for roomId={}, userId={}, dates={} to {}",
                request.getRoomId(), userId,
                request.getCheckInDate(), request.getCheckOutDate());

        // 1. Validate ngày check-in phải trước check-out
        if (!request.getCheckOutDate().isAfter(request.getCheckInDate())) {
            throw new IllegalArgumentException("Ngày check-out phải sau ngày check-in");
        }

        // 2. Tính số đêm ở
        int totalNights = (int) ChronoUnit.DAYS.between(request.getCheckInDate(), request.getCheckOutDate());

        // 3. Kiểm tra conflict với booking khác (optional - có thể bỏ qua trong demo)
        List<Booking> conflictingBookings = bookingRepository.findConflictingBookings(
                request.getRoomId(), request.getCheckInDate(), request.getCheckOutDate());

        if (!conflictingBookings.isEmpty()) {
            log.warn("Room {} has conflicting bookings for dates {} to {}",
                    request.getRoomId(), request.getCheckInDate(), request.getCheckOutDate());
            throw new IllegalStateException("Phòng đã được đặt trong khoảng thời gian này");
        }

        // 4. Tạo booking entity với status = PENDING_PAYMENT
        ListingResponse response = listingClient.getListingById("Bearer " + jwt.getTokenValue(), request.getRoomId()).getData();

        Booking booking = Booking.builder()
                .listingId(request.getRoomId())
                .hostId(UUID.fromString(response.getHostId()))
                .guestId(UUID.fromString(userId))
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .totalNights(totalNights)
                .totalPrice(totalNights * response.getPricing().getBasePrice().longValue())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
//                .numGuests(request.getGuestCount() != null ? request.getGuestCount() : 1)
                .numAdults(request.getNumberOfAdults())
                .numChildren(request.getNumberOfChildren())
                .numInfants(request.getNumberOfInfants())
                .numPets(request.getNumberOfPets())
                .guestNotes(request.getGuestNotes())
                .status(BookingStatus.PENDING_PAYMENT)  // LUÔN bắt đầu với PENDING_PAYMENT
                .build();

        // 5. Lưu vào database - @PrePersist sẽ set createdAt và expiresAt
        Booking savedBooking = bookingRepository.save(booking);

        log.info("Booking created successfully: bookingId={}, status={}, expiresAt={}",
                savedBooking.getBookingId(), savedBooking.getStatus(), savedBooking.getExpiresAt());

        // 6. Trả về response cho frontend để tiếp tục flow thanh toán
        return CreateBookingResponse.builder()
                .bookingId(savedBooking.getBookingId())
                .hostId(savedBooking.getHostId().toString())
                .status(savedBooking.getStatus())
                .totalAmount(savedBooking.getTotalPrice())
                .currency(savedBooking.getCurrency())
                .expiresAt(savedBooking.getExpiresAt())
                .message("Booking đã được tạo thành công. Vui lòng hoàn thành thanh toán trong 15 phút.")
                .build();
    }

    // =========================================
    // UPDATE BOOKING STATUS (gọi từ Payment Service qua webhook)
    // =========================================

    /**
     * Cập nhật trạng thái booking.
     * Được gọi bởi Payment Service khi nhận Stripe webhook.
     *
     * FLOW:
     * Stripe webhook → Payment Service → gọi endpoint này → update booking PENDING_PAYMENT → PAID
     *
     * @param bookingId ID của booking cần update
     * @param request chứa status mới và paymentIntentId
     */
    public BookingResponse updateBookingStatus(UUID bookingId,
                                               UpdateBookingStatusRequest request) {
        log.info("Updating booking status: bookingId={}, newStatus={}, paymentIntentId={}",
                bookingId, request.getStatus(), request.getPaymentIntentId());

        // 1. Tìm booking
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking không tồn tại: " + bookingId));

        // 2. Validate state transition
        validateStatusTransition(booking.getStatus(), request.getStatus());

        // 3. Update trạng thái
        BookingStatus oldStatus = booking.getStatus();
        booking.setStatus(request.getStatus());

        // 4. Lưu paymentIntentId nếu có (để đối chiếu sau này)
        if (request.getPaymentIntentId() != null) {
            booking.setPaymentIntentId(request.getPaymentIntentId());
        }

        // 5. Nếu chuyển sang PAID, ghi lại thời điểm thanh toán
        if (request.getStatus() == BookingStatus.PAID) {
            booking.setPaidAt(LocalDateTime.now());
            log.info("Booking {} marked as PAID at {}", bookingId, booking.getPaidAt());
        }

        // 6. Lưu vào database
        Booking updatedBooking = bookingRepository.save(booking);

        log.info("Booking {} status updated: {} → {}", bookingId, oldStatus, updatedBooking.getStatus());

        return mapToResponse(updatedBooking);
    }

    /**
     * Validate xem status transition có hợp lệ không.
     * Ví dụ: không thể chuyển từ PAID → PENDING_PAYMENT
     */
    private void validateStatusTransition(BookingStatus currentStatus, BookingStatus newStatus) {
        boolean isValid = switch (currentStatus) {
            case PENDING_PAYMENT -> newStatus == BookingStatus.PAID
                    || newStatus == BookingStatus.EXPIRED
                    || newStatus == BookingStatus.CANCELLED;
            case PAID -> newStatus == BookingStatus.CANCELLED; // Có thể hủy sau khi đã thanh toán
            case EXPIRED, CANCELLED -> false; // Terminal states - không thể chuyển
        };

        if (!isValid) {
            throw new IllegalStateException(
                    String.format("Không thể chuyển trạng thái booking từ %s sang %s",
                            currentStatus, newStatus));
        }
    }

    public List<BookingResponse> getBookingsByUserAndStatuses(List<BookingStatus> statuses) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String userId = jwt.getSubject();

        UUID guestId = UUID.fromString(userId);

        List<Booking> bookings;

        // nếu không truyền status → lấy tất cả
        if (statuses == null || statuses.isEmpty()) {
            bookings = bookingRepository.findByGuestId(guestId);
        } else {
            bookings = bookingRepository.findByGuestIdAndStatusIn(guestId, statuses);
        }

        return bookings.stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<BookingTripResponse> getMyBookings(BookingFilterType type) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID userId = UUID.fromString(jwt.getSubject());

        // 1. Get bookings
        List<Booking> bookings = bookingRepository.findBookingsByType(
                userId,
                type.name(),
                LocalDateTime.now()
        );

        if (bookings.isEmpty()) {
            return List.of();
        }

        // 2. Extract listingIds
        List<UUID> listingIds = bookings.stream()
                .map(Booking::getListingId)
                .distinct()
                .toList();

        // 3. Batch call listing service
        List<ListingResponse> listings =
                listingClient.getListingsByIds("Bearer " + jwt.getTokenValue(), new ListingBatchRequest(listingIds))
                        .getData();

        // 4. Convert to map (VERY IMPORTANT)
        Map<UUID, ListingResponse> listingMap = listings.stream()
                .collect(java.util.stream.Collectors.toMap(
                        ListingResponse::getListingId,
                        l -> l
                ));

        // 5. Merge booking + listing
        return bookings.stream()
                .map(booking -> {
                    ListingResponse listing = listingMap.get(booking.getListingId());

                    return mapToTripResponse(booking, listing);
                })
                .toList();
    }

    /**
     * Map Booking entity → BookingResponse DTO
     */
    private BookingResponse mapToResponse(Booking booking) {
        // Tính thời gian còn lại để thanh toán
        long secondsUntilExpiry = 0;
        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT && booking.getExpiresAt() != null) {
            secondsUntilExpiry = Math.max(0,
                    ChronoUnit.SECONDS.between(LocalDateTime.now(), booking.getExpiresAt()));
        }

        return BookingResponse.builder()
                .id(booking.getBookingId())
                .roomId(booking.getListingId())
                .userId(booking.getGuestId())
//                .roomName(booking.getRoomName())
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
                .guestCount(booking.getNumAdults())
                .guestNotes(booking.getGuestNotes())
                .secondsUntilExpiry(secondsUntilExpiry)
                .build();
    }

    private BookingTripResponse mapToTripResponse(
            Booking booking,
            ListingResponse listing
    ) {

//        long secondsUntilExpiry = 0;
//
//        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT
//                && booking.getExpiresAt() != null) {
//
//            secondsUntilExpiry = Math.max(0,
//                    ChronoUnit.SECONDS.between(
//                            LocalDateTime.now(),
//                            booking.getExpiresAt()
//                    ));
//        }

        // Trip label logic (Airbnb style)
        String tripLabel = resolveTripLabel(booking);

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
//                .secondsUntilExpiry(secondsUntilExpiry)

                .numAdults(booking.getNumAdults())
                .numChildren(booking.getNumChildren())
                .numInfants(booking.getNumInfants())
                .numPets(booking.getNumPets())

                // ===== Listing =====
                .title(listing != null ? listing.getTitle() : null)
                .city(listing != null ? listing.getCity() : null)
                .country(listing != null ? listing.getCountry() : null)
                .basePrice(listing != null && listing.getPricing() != null
                        ? listing.getPricing().getBasePrice().longValue()
                        : null)
                .coverImageUrl(resolveCoverImage(listing))

                // ===== UI =====
                .tripLabel(tripLabel)

                .build();
    }

    private String resolveTripLabel(Booking booking) {

        LocalDate today = LocalDate.now();

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return "Cancelled trip";
        }

        if (booking.getStatus() == BookingStatus.PAID) {

            if (booking.getCheckInDate().isAfter(today)) {
                return "Upcoming trip";
            }

            if (booking.getCheckOutDate().isBefore(today)) {
                return "Past trip";
            }

            return "Ongoing trip";
        }

        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            return "Waiting for payment";
        }

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
                .orElse(
                        listing.getPhotos().stream()
                                .findFirst()
                                .map(photo -> photo.getPhotoUrl())
                                .orElse(null)
                );
    }
}
