package com.bookingservice.controller;

import com.bookingservice.dto.ApiResponse;
import com.bookingservice.dto.request.BookingFilterType;
import com.bookingservice.dto.request.CreateBookingRequest;
import com.bookingservice.dto.request.UpdateBookingStatusRequest;
import com.bookingservice.dto.response.BookingResponse;
import com.bookingservice.dto.response.BookingTripResponse;
import com.bookingservice.dto.response.CreateBookingResponse;
import com.bookingservice.entity.BookingStatus;
import com.bookingservice.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

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

        log.info("Received create booking request: roomId={}, userId {}",
                request.getRoomId(), userId);

        CreateBookingResponse response = bookingService.createBooking(request);

        // Trả về 201 Created khi tạo thành công
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

    /**
     * Update trạng thái booking.
     *
     * INTERNAL ENDPOINT - Chỉ được gọi từ Payment Service (không expose ra internet)
     * Khi Stripe webhook xác nhận thanh toán thành công:
     * Payment Service → gọi endpoint này → booking chuyển sang PAID
     *
     * PATCH /api/bookings/{id}/status
     */
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
