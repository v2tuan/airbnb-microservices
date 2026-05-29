package com.bookingservice.controller;

import com.bookingservice.dto.ApiResponse;
import com.bookingservice.dto.request.BookingFilterType;
import com.bookingservice.dto.request.CancelBookingRequest;
import com.bookingservice.dto.request.CreateBookingRequest;
import com.bookingservice.dto.request.UpdateBookingStatusRequest;
import com.bookingservice.dto.response.BookingDetailResponse;
import com.bookingservice.dto.response.BookingResponse;
import com.bookingservice.dto.response.BookingTripResponse;
import com.bookingservice.dto.response.CreateBookingResponse;
import com.bookingservice.dto.response.HostReservationsPageResponse;
import com.bookingservice.dto.response.ReservationDetailResponse;
import com.bookingservice.dto.response.ReservationResponse;
import com.bookingservice.entity.BookingStatus;
import com.bookingservice.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@Slf4j
@RequiredArgsConstructor
public class BookingController {
    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<CreateBookingResponse> createBooking(
            @Valid @RequestBody CreateBookingRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String userId = jwt.getSubject();

        log.info("Received create booking request: roomId={}, userId {}", request.getRoomId(), userId);
        CreateBookingResponse response = bookingService.createBooking(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public List<BookingResponse> getMyBookings(
            @RequestParam(required = false) List<BookingStatus> statuses
    ) {
        return bookingService.getBookingsByUserAndStatuses(statuses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> getBooking(@PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.getBooking(id));
    }

    @GetMapping("/{id}/detail")
    public ResponseEntity<ApiResponse<BookingDetailResponse>> getBookingDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.<BookingDetailResponse>builder()
                .success(true)
                .message("Get booking detail success")
                .data(bookingService.getMyBookingDetail(id))
                .build());
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(
            @PathVariable UUID id,
            @Valid @RequestBody CancelBookingRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<BookingResponse>builder()
                .success(true)
                .message("Cancel booking success")
                .data(bookingService.cancelMyBooking(id, request))
                .build());
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<BookingTripResponse>>> getMyBookings(
            @RequestParam(defaultValue = "ALL") BookingFilterType type
    ) {
        return ResponseEntity.ok(ApiResponse.<List<BookingTripResponse>>builder()
                .success(true)
                .message("Get booking success")
                .data(bookingService.getMyBookings(type))
                .build());
    }

    @GetMapping("/host/listings/{listingId}/reservations")
    public ResponseEntity<ApiResponse<List<ReservationResponse>>> getReservationsByListing(
            @PathVariable UUID listingId,
            @RequestParam(required = false) List<BookingStatus> statuses
    ) {
        return ResponseEntity.ok(ApiResponse.<List<ReservationResponse>>builder()
                .success(true)
                .message("Get reservations success")
                .data(bookingService.getReservationsByListing(listingId, statuses))
                .build());
    }

    /**
     * API production cho dashboard reservation của host.
     * Backend tự aggregate scope "All listings", filter/search và pagination theo query hiện tại.
     * Response kèm stats/statusCounts/occupiedDates/nextReservations để UI không phải fetch all.
     */
    @GetMapping("/host/reservations")
    public ResponseEntity<ApiResponse<HostReservationsPageResponse>> getHostReservations(
            @RequestParam(required = false) UUID listingId,
            @RequestParam(required = false) List<BookingStatus> statuses,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size
    ) {
        return ResponseEntity.ok(ApiResponse.<HostReservationsPageResponse>builder()
                .success(true)
                .message("Get host reservations success")
                .data(bookingService.getHostReservations(listingId, statuses, search, dateFrom, dateTo, page, size))
                .build());
    }

    @GetMapping("/host/reservations/{reservationId}")
    public ResponseEntity<ApiResponse<ReservationDetailResponse>> getReservationDetail(
            @PathVariable UUID reservationId
    ) {
        return ResponseEntity.ok(ApiResponse.<ReservationDetailResponse>builder()
                .success(true)
                .message("Get reservation detail success")
                .data(bookingService.getReservationDetail(reservationId))
                .build());
    }

    @PatchMapping("/host/reservations/{reservationId}/status")
    public ResponseEntity<ApiResponse<ReservationDetailResponse>> updateReservationStatus(
            @PathVariable UUID reservationId,
            @Valid @RequestBody UpdateBookingStatusRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<ReservationDetailResponse>builder()
                .success(true)
                .message("Update reservation status success")
                .data(bookingService.updateReservationStatus(reservationId, request))
                .build());
    }

    @PostMapping("/{id}/status")
    public ResponseEntity<BookingResponse> updateBookingStatus(
            @PathVariable UUID id,
            @RequestBody UpdateBookingStatusRequest request) {
        log.info("Updating booking {} status to {}", id, request.getStatus());
        BookingResponse response = bookingService.updateBookingStatus(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/check-in")
    public ResponseEntity<BookingResponse> checkIn(@PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.checkIn(id));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<BookingResponse> complete(@PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.complete(id));
    }
}
