package com.bookingservice.controller;

import com.bookingservice.dto.ApiResponse;
import com.bookingservice.dto.request.BookingFilterType;
import com.bookingservice.dto.request.AdminComplaintDecisionRequest;
import com.bookingservice.dto.request.AdminForceCancelRequest;
import com.bookingservice.dto.request.AdminListingStatusRequest;
import com.bookingservice.dto.request.BatchAvailabilityRequest;
import com.bookingservice.dto.request.CancelBookingRequest;
import com.bookingservice.dto.request.ConfirmCancellationQuoteRequest;
import com.bookingservice.dto.request.ConfirmHostCancellationQuoteRequest;
import com.bookingservice.dto.request.CreateComplaintRequest;
import com.bookingservice.dto.request.CreateBookingRequest;
import com.bookingservice.dto.request.HostCancellationQuoteRequest;
import com.bookingservice.dto.request.HostComplaintResponseRequest;
import com.bookingservice.dto.request.UpdateBookingStatusRequest;
import com.bookingservice.dto.request.WaiveHostPenaltyRequest;
import com.bookingservice.dto.response.BookingDetailResponse;
import com.bookingservice.dto.response.BookingResponse;
import com.bookingservice.dto.response.BookingTripResponse;
import com.bookingservice.dto.response.ComplaintResponse;
import com.bookingservice.dto.response.CreateBookingResponse;
import com.bookingservice.dto.response.GuestCancellationQuoteResponse;
import com.bookingservice.dto.response.HostPenaltyResponse;
import com.bookingservice.dto.response.HostCancellationQuoteResponse;
import com.bookingservice.dto.response.HostReservationsPageResponse;
import com.bookingservice.dto.response.ReservationDetailResponse;
import com.bookingservice.dto.response.ReservationResponse;
import com.bookingservice.entity.BookingStatus;
import com.bookingservice.entity.ComplaintStatus;
import com.bookingservice.service.BookingService;
import com.bookingservice.service.ComplaintService;
import com.bookingservice.service.HostPenaltyService;
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
import java.util.Map;
import java.util.UUID;

@RestController
@Slf4j
@RequiredArgsConstructor
public class BookingController {
    private final BookingService bookingService;
    private final ComplaintService complaintService;
    private final HostPenaltyService hostPenaltyService;

    @GetMapping("/availability")
    public ResponseEntity<ApiResponse<Boolean>> isListingAvailable(
            @RequestParam UUID listingId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    ) {
        return ResponseEntity.ok(ApiResponse.<Boolean>builder()
                .success(true)
                .message("Availability checked")
                .data(bookingService.isListingAvailable(listingId, checkIn, checkOut))
                .build());
    }

    @PostMapping("/availability/batch")
    public ResponseEntity<ApiResponse<Map<UUID, Boolean>>> getListingsAvailability(
            @RequestBody BatchAvailabilityRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<Map<UUID, Boolean>>builder()
                .success(true)
                .message("Batch availability checked")
                .data(bookingService.getListingsAvailability(request.listingIds(), request.checkIn(), request.checkOut()))
                .build());
    }

    @GetMapping("/availability/active-bookings")
    public ResponseEntity<ApiResponse<Boolean>> hasActiveBookings(@RequestParam UUID listingId) {
        return ResponseEntity.ok(ApiResponse.<Boolean>builder()
                .success(true)
                .message("Active bookings checked")
                .data(bookingService.hasActiveBookings(listingId))
                .build());
    }

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

    @PostMapping("/{id}/cancellation-quotes")
    public ResponseEntity<ApiResponse<GuestCancellationQuoteResponse>> requestGuestCancellationQuote(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.<GuestCancellationQuoteResponse>builder()
                .success(true)
                .message("Cancellation quote created")
                .data(bookingService.requestGuestCancellationQuote(id))
                .build());
    }

    @PostMapping("/{id}/cancel/confirm")
    public ResponseEntity<ApiResponse<BookingResponse>> confirmGuestCancellationQuote(
            @PathVariable UUID id,
            @Valid @RequestBody ConfirmCancellationQuoteRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<BookingResponse>builder()
                .success(true)
                .message("Cancel booking success")
                .data(bookingService.confirmGuestCancellationQuote(id, request))
                .build());
    }

    @PostMapping("/{id}/complaints")
    public ResponseEntity<ApiResponse<ComplaintResponse>> createComplaint(
            @PathVariable UUID id,
            @Valid @RequestBody CreateComplaintRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<ComplaintResponse>builder()
                .success(true)
                .message("Complaint created")
                .data(complaintService.createComplaint(id, request))
                .build());
    }

    @GetMapping("/me/complaints")
    public ResponseEntity<ApiResponse<List<ComplaintResponse>>> getMyComplaints() {
        return ResponseEntity.ok(ApiResponse.<List<ComplaintResponse>>builder()
                .success(true)
                .message("Get complaints success")
                .data(complaintService.getMyComplaints())
                .build());
    }

    @PostMapping("/complaints/{complaintId}/accept")
    public ResponseEntity<ApiResponse<ComplaintResponse>> acceptHostResponse(@PathVariable UUID complaintId) {
        return ResponseEntity.ok(ApiResponse.<ComplaintResponse>builder()
                .success(true)
                .message("Complaint resolved")
                .data(complaintService.acceptHostResponse(complaintId))
                .build());
    }

    @PostMapping("/complaints/{complaintId}/escalate")
    public ResponseEntity<ApiResponse<ComplaintResponse>> escalateComplaint(@PathVariable UUID complaintId) {
        return ResponseEntity.ok(ApiResponse.<ComplaintResponse>builder()
                .success(true)
                .message("Complaint escalated")
                .data(complaintService.escalateToAdmin(complaintId))
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

    @PostMapping("/host/reservations/{reservationId}/cancellation-quotes")
    public ResponseEntity<ApiResponse<HostCancellationQuoteResponse>> requestHostCancellationQuote(
            @PathVariable UUID reservationId,
            @Valid @RequestBody HostCancellationQuoteRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<HostCancellationQuoteResponse>builder()
                .success(true)
                .message("Host cancellation quote created")
                .data(bookingService.requestHostCancellationQuote(reservationId, request))
                .build());
    }

    @PostMapping("/host/reservations/{reservationId}/cancel/confirm")
    public ResponseEntity<ApiResponse<ReservationDetailResponse>> confirmHostCancellationQuote(
            @PathVariable UUID reservationId,
            @Valid @RequestBody ConfirmHostCancellationQuoteRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<ReservationDetailResponse>builder()
                .success(true)
                .message("Cancel reservation success")
                .data(bookingService.confirmHostCancellationQuote(reservationId, request))
                .build());
    }

    @GetMapping("/host/complaints")
    public ResponseEntity<ApiResponse<List<ComplaintResponse>>> getHostComplaints() {
        return ResponseEntity.ok(ApiResponse.<List<ComplaintResponse>>builder()
                .success(true)
                .message("Get host complaints success")
                .data(complaintService.getHostComplaints())
                .build());
    }

    @PostMapping("/host/complaints/{complaintId}/respond")
    public ResponseEntity<ApiResponse<ComplaintResponse>> respondToComplaint(
            @PathVariable UUID complaintId,
            @Valid @RequestBody HostComplaintResponseRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<ComplaintResponse>builder()
                .success(true)
                .message("Complaint response saved")
                .data(complaintService.respondAsHost(complaintId, request))
                .build());
    }

    @GetMapping("/admin/complaints")
    public ResponseEntity<ApiResponse<List<ComplaintResponse>>> getAdminComplaints(
            @RequestParam(required = false) ComplaintStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.<List<ComplaintResponse>>builder()
                .success(true)
                .message("Get admin complaints success")
                .data(complaintService.getAdminComplaints(status))
                .build());
    }

    @PostMapping("/admin/complaints/{complaintId}/decision")
    public ResponseEntity<ApiResponse<ComplaintResponse>> decideComplaint(
            @PathVariable UUID complaintId,
            @Valid @RequestBody AdminComplaintDecisionRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<ComplaintResponse>builder()
                .success(true)
                .message("Complaint decision saved")
                .data(complaintService.decideComplaint(complaintId, request))
                .build());
    }

    @PostMapping("/admin/bookings/{bookingId}/force-cancel")
    public ResponseEntity<ApiResponse<ReservationDetailResponse>> forceCancelBooking(
            @PathVariable UUID bookingId,
            @Valid @RequestBody AdminForceCancelRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<ReservationDetailResponse>builder()
                .success(true)
                .message("Booking cancelled by admin")
                .data(complaintService.forceCancelBooking(bookingId, request))
                .build());
    }

    @PostMapping("/admin/host-penalties/{penaltyId}/waive")
    public ResponseEntity<ApiResponse<HostPenaltyResponse>> waivePenalty(
            @PathVariable UUID penaltyId,
            @Valid @RequestBody WaiveHostPenaltyRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.<HostPenaltyResponse>builder()
                .success(true)
                .message("Host penalty waived")
                .data(hostPenaltyService.waivePenalty(penaltyId, request.getReason()))
                .build());
    }

    @PostMapping("/admin/listings/{listingId}/suspend")
    public ResponseEntity<ApiResponse<Void>> adminSuspendListing(
            @PathVariable UUID listingId,
            @Valid @RequestBody AdminListingStatusRequest request
    ) {
        complaintService.suspendListing(listingId, request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Listing suspended")
                .build());
    }

    @PostMapping("/admin/listings/{listingId}/unsuspend")
    public ResponseEntity<ApiResponse<Void>> adminUnsuspendListing(
            @PathVariable UUID listingId,
            @Valid @RequestBody AdminListingStatusRequest request
    ) {
        complaintService.unsuspendListing(listingId, request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Listing unsuspended")
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

    @PostMapping("/{id}/check-out")
    public ResponseEntity<BookingResponse> checkOut(@PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.checkOut(id));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<BookingResponse> complete(@PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.complete(id));
    }
}
