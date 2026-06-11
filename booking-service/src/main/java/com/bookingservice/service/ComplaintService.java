package com.bookingservice.service;

import com.bookingservice.dto.request.AdminComplaintDecisionRequest;
import com.bookingservice.dto.request.AdminForceCancelRequest;
import com.bookingservice.dto.request.AdminListingStatusRequest;
import com.bookingservice.dto.request.BookingRefundRequest;
import com.bookingservice.dto.request.CreateComplaintRequest;
import com.bookingservice.dto.request.HostComplaintResponseRequest;
import com.bookingservice.dto.request.ListingSuspensionRequest;
import com.bookingservice.dto.request.ListingUnsuspensionRequest;
import com.bookingservice.dto.response.ComplaintResponse;
import com.bookingservice.dto.response.BookingResponse;
import com.bookingservice.dto.response.ReservationDetailResponse;
import com.bookingservice.entity.AdminComplaintDecision;
import com.bookingservice.entity.Booking;
import com.bookingservice.entity.BookingComplaint;
import com.bookingservice.entity.BookingStatus;
import com.bookingservice.entity.ComplaintStatus;
import com.bookingservice.entity.ComplaintType;
import com.bookingservice.exception.BusinessException;
import com.bookingservice.repository.BookingComplaintRepository;
import com.bookingservice.repository.BookingRepository;
import com.bookingservice.repository.client.ListingClient;
import com.bookingservice.repository.client.PaymentClient;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComplaintService {
    private static final int COMPLAINT_WINDOW_HOURS = 24;
    private static final int HOST_RESPONSE_DEADLINE_HOURS = 24;

    private static final List<ComplaintStatus> ACTIVE_COMPLAINT_STATUSES = List.of(
            ComplaintStatus.WAITING_HOST_RESPONSE,
            ComplaintStatus.OPEN,
            ComplaintStatus.ESCALATED_TO_ADMIN,
            ComplaintStatus.RESOLVED,
            ComplaintStatus.REJECTED
    );

    private static final Map<ComplaintType, Collection<AdminComplaintDecision>> DECISION_MATRIX = Map.of(
            ComplaintType.CANNOT_CHECK_IN, List.of(
                    AdminComplaintDecision.FULL_REFUND,
                    AdminComplaintDecision.REJECT,
                    AdminComplaintDecision.SUSPEND_LISTING
            ),
            ComplaintType.NOT_AS_DESCRIBED, List.of(
                    AdminComplaintDecision.PARTIAL_REFUND,
                    AdminComplaintDecision.FULL_REFUND,
                    AdminComplaintDecision.REJECT,
                    AdminComplaintDecision.SUSPEND_LISTING
            ),
            ComplaintType.UNCLEAN, List.of(
                    AdminComplaintDecision.RESOLVE_NO_REFUND,
                    AdminComplaintDecision.PARTIAL_REFUND,
                    AdminComplaintDecision.REJECT
            ),
            ComplaintType.MISSING_AMENITY, List.of(
                    AdminComplaintDecision.RESOLVE_NO_REFUND,
                    AdminComplaintDecision.PARTIAL_REFUND,
                    AdminComplaintDecision.REJECT
            ),
            ComplaintType.SAFETY_ISSUE, List.of(
                    AdminComplaintDecision.FULL_REFUND,
                    AdminComplaintDecision.REJECT,
                    AdminComplaintDecision.SUSPEND_LISTING
            )
    );

    private final BookingComplaintRepository complaintRepository;
    private final BookingRepository bookingRepository;
    private final PaymentClient paymentClient;
    private final ListingClient listingClient;
    private final NotificationEventPublisher notificationEventPublisher;

    @Transactional
    public ComplaintResponse createComplaint(UUID bookingId, CreateComplaintRequest request) {
        Jwt jwt = currentJwt();
        UUID guestId = UUID.fromString(jwt.getSubject());
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> BusinessException.notFound("Booking not found"));

        if (!booking.getGuestId().equals(guestId)) {
            throw BusinessException.notFound("Booking not found");
        }
        validateComplaintCreationEligibility(booking);
        if (complaintRepository.existsByBookingIdAndStatusIn(bookingId, ACTIVE_COMPLAINT_STATUSES)) {
            throw BusinessException.conflict("Booking already has an active complaint");
        }

        LocalDateTime now = LocalDateTime.now();
        BookingComplaint complaint = complaintRepository.save(BookingComplaint.builder()
                .bookingId(booking.getBookingId())
                .guestId(booking.getGuestId())
                .hostId(booking.getHostId())
                .listingId(booking.getListingId())
                .type(request.getType())
                .status(ComplaintStatus.WAITING_HOST_RESPONSE)
                .description(request.getDescription().trim())
                .evidenceUrls(serializeEvidenceUrls(request.getEvidenceUrls()))
                .hostResponseDeadline(now.plusHours(HOST_RESPONSE_DEADLINE_HOURS))
                .build());
        publishComplaintEvent("COMPLAINT_CREATED", complaint, false, true, false);
        return mapToResponse(complaint);
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponse> getMyComplaints() {
        UUID guestId = UUID.fromString(currentJwt().getSubject());
        return complaintRepository.findByGuestIdOrderByCreatedAtDesc(guestId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponse> getHostComplaints() {
        UUID hostId = UUID.fromString(currentJwt().getSubject());
        return complaintRepository.findByHostIdOrderByCreatedAtDesc(hostId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponse> getAdminComplaints(ComplaintStatus status) {
        requireAdmin(currentJwt());
        return complaintRepository.findAll()
                .stream()
                .filter(complaint -> status == null || complaint.getStatus() == status)
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public ComplaintResponse respondAsHost(UUID complaintId, HostComplaintResponseRequest request) {
        Jwt jwt = currentJwt();
        UUID hostId = UUID.fromString(jwt.getSubject());
        BookingComplaint complaint = complaintRepository.findByIdForUpdate(complaintId)
                .orElseThrow(() -> BusinessException.notFound("Complaint not found"));
        if (!complaint.getHostId().equals(hostId) && !isAdmin(jwt)) {
            throw BusinessException.notFound("Complaint not found");
        }
        if (complaint.getStatus() != ComplaintStatus.WAITING_HOST_RESPONSE) {
            throw BusinessException.conflict("Complaint is not waiting for host response");
        }
        complaint.setHostResponse(request.getResponse().trim());
        complaint.setHostRespondedAt(LocalDateTime.now());
        complaint.setStatus(ComplaintStatus.OPEN);
        complaint.setUpdatedAt(LocalDateTime.now());
        return mapToResponse(complaintRepository.save(complaint));
    }

    @Transactional
    public ComplaintResponse acceptHostResponse(UUID complaintId) {
        BookingComplaint complaint = complaintRepository.findByIdForUpdate(complaintId)
                .orElseThrow(() -> BusinessException.notFound("Complaint not found"));
        UUID guestId = UUID.fromString(currentJwt().getSubject());
        if (!complaint.getGuestId().equals(guestId)) {
            throw BusinessException.notFound("Complaint not found");
        }
        if (complaint.getStatus() != ComplaintStatus.OPEN) {
            throw BusinessException.conflict("Complaint is not open");
        }
        complaint.setStatus(ComplaintStatus.RESOLVED);
        complaint.setResolvedAt(LocalDateTime.now());
        complaint.setUpdatedAt(LocalDateTime.now());
        BookingComplaint saved = complaintRepository.save(complaint);
        publishComplaintEvent("COMPLAINT_RESOLVED", saved, true, true, false);
        return mapToResponse(saved);
    }

    @Transactional
    public ComplaintResponse escalateToAdmin(UUID complaintId) {
        BookingComplaint complaint = complaintRepository.findByIdForUpdate(complaintId)
                .orElseThrow(() -> BusinessException.notFound("Complaint not found"));
        UUID guestId = UUID.fromString(currentJwt().getSubject());
        if (!complaint.getGuestId().equals(guestId)) {
            throw BusinessException.notFound("Complaint not found");
        }
        if (complaint.getStatus() != ComplaintStatus.OPEN) {
            throw BusinessException.conflict("Complaint cannot be escalated");
        }
        BookingComplaint saved = escalateComplaint(complaint);
        publishComplaintEvent("COMPLAINT_ESCALATED", saved, false, false, true);
        return mapToResponse(saved);
    }

    @Transactional
    public ComplaintResponse decideComplaint(UUID complaintId, AdminComplaintDecisionRequest request) {
        Jwt jwt = currentJwt();
        requireAdmin(jwt);
        BookingComplaint complaint = complaintRepository.findByIdForUpdate(complaintId)
                .orElseThrow(() -> BusinessException.notFound("Complaint not found"));
        Booking booking = bookingRepository.findByIdForUpdate(complaint.getBookingId())
                .orElseThrow(() -> BusinessException.notFound("Booking not found"));

        if (complaint.getStatus() != ComplaintStatus.ESCALATED_TO_ADMIN) {
            throw BusinessException.conflict("Complaint is not escalated to admin");
        }
        if (!DECISION_MATRIX.getOrDefault(complaint.getType(), List.of()).contains(request.getDecision())) {
            throw BusinessException.conflict("Decision is not allowed for complaint type");
        }

        LocalDateTime now = LocalDateTime.now();
        complaint.setAdminDecision(request.getDecision());
        complaint.setAdminNote(request.getAdminNote().trim());
        complaint.setUpdatedAt(now);

        switch (request.getDecision()) {
            case REJECT -> {
                complaint.setStatus(ComplaintStatus.REJECTED);
                complaint.setResolvedAt(now);
                publishComplaintEvent("COMPLAINT_REJECTED", complaint, true, true, false);
            }
            case RESOLVE_NO_REFUND -> {
                complaint.setStatus(ComplaintStatus.RESOLVED);
                complaint.setResolvedAt(now);
                publishComplaintEvent("COMPLAINT_RESOLVED", complaint, true, true, false);
            }
            case PARTIAL_REFUND -> {
                BigDecimal amount = request.getRefundAmount();
                if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0
                        || amount.compareTo(totalAmount(booking)) >= 0) {
                    throw BusinessException.badRequest("Partial refund must be greater than zero and less than total amount");
                }
                complaint.setRefundAmount(money(amount));
                createRefund(jwt, booking, money(amount), "COMPLAINT_PARTIAL_REFUND", "Complaint decision " + complaintId,
                        "COMPLAINT_DECISION", complaintId);
                publishRefundCreated(booking, money(amount), "COMPLAINT_DECISION", complaintId);
                complaint.setStatus(ComplaintStatus.RESOLVED);
                complaint.setResolvedAt(now);
                publishComplaintEvent("COMPLAINT_RESOLVED", complaint, true, true, false);
            }
            case FULL_REFUND -> {
                BigDecimal amount = totalAmount(booking);
                complaint.setRefundAmount(amount);
                createRefund(jwt, booking, amount, "COMPLAINT_FULL_REFUND", "Complaint decision " + complaintId,
                        "COMPLAINT_DECISION", complaintId);
                publishRefundCreated(booking, amount, "COMPLAINT_DECISION", complaintId);
                if (booking.getStatus() == BookingStatus.CHECKED_IN) {
                    booking.setStatus(BookingStatus.CANCELLED_BY_ADMIN);
                    booking.setCancelledAt(now);
                    booking.setCancellationReason("Admin complaint full refund: " + request.getAdminNote().trim());
                    bookingRepository.save(booking);
                    publishBookingCancelledByAdmin(booking);
                }
                complaint.setStatus(ComplaintStatus.RESOLVED);
                complaint.setResolvedAt(now);
                publishComplaintEvent("COMPLAINT_RESOLVED", complaint, true, true, false);
            }
            case SUSPEND_LISTING -> {
                listingClient.suspendListing("Bearer " + jwt.getTokenValue(), complaint.getListingId(),
                        ListingSuspensionRequest.builder()
                                .suspendedUntil(now.plusDays(7))
                                .reason("Admin complaint decision: " + request.getAdminNote().trim())
                                .build());
                publishListingEvent("LISTING_SUSPENDED", complaint.getListingId(), complaint.getHostId());
                complaint.setStatus(ComplaintStatus.RESOLVED);
                complaint.setResolvedAt(now);
                publishComplaintEvent("COMPLAINT_RESOLVED", complaint, true, true, false);
            }
        }

        return mapToResponse(complaintRepository.save(complaint));
    }

    @Transactional
    public ReservationDetailResponse forceCancelBooking(UUID bookingId, @Valid AdminForceCancelRequest request) {
        Jwt jwt = currentJwt();
        requireAdmin(jwt);
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> BusinessException.notFound("Booking not found"));
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw BusinessException.conflict("Admin can force cancel only confirmed or checked-in bookings");
        }

        LocalDateTime now = LocalDateTime.now();
        booking.setStatus(BookingStatus.CANCELLED_BY_ADMIN);
        booking.setCancelledAt(now);
        booking.setCancellationReason(request.getReason() + " - " + request.getAdminNote());
        Booking saved = bookingRepository.save(booking);
        publishBookingCancelledByAdmin(saved);

        if (request.getRefundAmount() != null && request.getRefundAmount().compareTo(BigDecimal.ZERO) > 0) {
            createRefund(jwt, saved, money(request.getRefundAmount()), "ADMIN_FORCE_CANCELLATION",
                    "Admin force cancellation: " + request.getAdminNote(), "ADMIN_FORCE_CANCELLATION", saved.getBookingId());
            publishRefundCreated(saved, money(request.getRefundAmount()), "ADMIN_FORCE_CANCELLATION", saved.getBookingId());
        }

        return ReservationDetailResponse.builder()
                .reservationId(saved.getBookingId())
                .reservationCode(saved.getBookingId().toString().substring(0, 8).toUpperCase())
                .listingId(saved.getListingId())
                .hostId(saved.getHostId())
                .guestId(saved.getGuestId())
                .checkInDate(saved.getCheckInDate())
                .checkOutDate(saved.getCheckOutDate())
                .totalNights(saved.getTotalNights())
                .status(saved.getStatus())
                .statusDisplayName(BookingResponse.getStatusDisplayName(saved.getStatus()))
                .currency(saved.getCurrency())
                .totalAmount(saved.getTotalPrice())
                .paymentIntentId(saved.getPaymentIntentId())
                .createdAt(saved.getCreatedAt())
                .expiresAt(saved.getExpiresAt())
                .paidAt(saved.getPaidAt())
                .checkedInAt(saved.getCheckedInAt())
                .checkedOutAt(saved.getCheckedOutAt())
                .completedAt(saved.getCompletedAt())
                .cancelledAt(saved.getCancelledAt())
                .cancellationReason(saved.getCancellationReason())
                .numAdults(saved.getNumAdults())
                .numChildren(saved.getNumChildren())
                .numInfants(saved.getNumInfants())
                .numPets(saved.getNumPets())
                .guestNotes(saved.getGuestNotes())
                .build();
    }

    public void suspendListing(UUID listingId, AdminListingStatusRequest request) {
        Jwt jwt = currentJwt();
        requireAdmin(jwt);
        UUID hostId = resolveListingHostId("Bearer " + jwt.getTokenValue(), listingId);
        listingClient.suspendListing("Bearer " + jwt.getTokenValue(), listingId,
                ListingSuspensionRequest.builder()
                        .suspendedUntil(request.getSuspendedUntil())
                        .reason(request.getReason())
                        .build());
        publishListingEvent("LISTING_SUSPENDED", listingId, hostId);
    }

    public void unsuspendListing(UUID listingId, AdminListingStatusRequest request) {
        Jwt jwt = currentJwt();
        requireAdmin(jwt);
        UUID hostId = resolveListingHostId("Bearer " + jwt.getTokenValue(), listingId);
        listingClient.unsuspendListing("Bearer " + jwt.getTokenValue(), listingId,
                ListingUnsuspensionRequest.builder()
                        .reason(request.getReason())
                        .build());
        publishListingEvent("LISTING_UNSUSPENDED", listingId, hostId);
    }

    @Scheduled(fixedDelayString = "${booking.complaints.auto-escalate-delay-ms:60000}")
    @Transactional
    public void autoEscalateOverdueComplaints() {
        List<BookingComplaint> overdue = complaintRepository.findByStatusAndHostResponseDeadlineBefore(
                ComplaintStatus.WAITING_HOST_RESPONSE,
                LocalDateTime.now()
        );
        overdue.forEach(complaint -> {
            BookingComplaint escalated = escalateComplaint(complaint);
            publishComplaintEvent("COMPLAINT_ESCALATED", escalated, false, false, true);
        });
    }

    @Scheduled(fixedDelayString = "${booking.complaints.auto-close-delay-ms:300000}")
    @Transactional
    public void autoCloseFinalizedComplaints() {
        LocalDateTime closeBefore = LocalDateTime.now().minusHours(24);
        List<BookingComplaint> finalized = complaintRepository.findByStatusInAndResolvedAtBefore(
                List.of(ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED),
                closeBefore
        );
        finalized.forEach(complaint -> {
            complaint.setStatus(ComplaintStatus.CLOSED);
            complaint.setClosedAt(LocalDateTime.now());
            complaint.setUpdatedAt(LocalDateTime.now());
            complaintRepository.save(complaint);
        });
    }

    private void validateComplaintCreationEligibility(Booking booking) {
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw BusinessException.conflict("Complaint can be created only for checked-in bookings");
        }
        if (booking.getCheckedInAt() == null
                || booking.getCheckedInAt().plusHours(COMPLAINT_WINDOW_HOURS).isBefore(LocalDateTime.now())) {
            throw BusinessException.conflict("Complaint window has expired");
        }
    }

    private BookingComplaint escalateComplaint(BookingComplaint complaint) {
        complaint.setStatus(ComplaintStatus.ESCALATED_TO_ADMIN);
        complaint.setEscalatedAt(LocalDateTime.now());
        complaint.setUpdatedAt(LocalDateTime.now());
        return complaintRepository.save(complaint);
    }

    private void createRefund(
            Jwt jwt,
            Booking booking,
            BigDecimal amount,
            String reason,
            String details,
            String businessCause,
            UUID businessCauseId
    ) {
        paymentClient.createBookingRefund(
                "Bearer " + jwt.getTokenValue(),
                booking.getBookingId(),
                BookingRefundRequest.builder()
                        .refundAmount(amount)
                        .refundReason(reason)
                        .refundDetails(details)
                        .businessCause(businessCause)
                        .businessCauseId(businessCauseId)
                        .build()
        );
    }

    private BigDecimal totalAmount(Booking booking) {
        return money(BigDecimal.valueOf(booking.getTotalPrice()));
    }

    private BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private String serializeEvidenceUrls(List<String> evidenceUrls) {
        if (evidenceUrls == null || evidenceUrls.isEmpty()) {
            return null;
        }
        return evidenceUrls.stream()
                .filter(url -> url != null && !url.isBlank())
                .map(String::trim)
                .collect(java.util.stream.Collectors.joining("\n"));
    }

    private List<String> deserializeEvidenceUrls(String evidenceUrls) {
        if (evidenceUrls == null || evidenceUrls.isBlank()) {
            return List.of();
        }
        return evidenceUrls.lines().toList();
    }

    private ComplaintResponse mapToResponse(BookingComplaint complaint) {
        return ComplaintResponse.builder()
                .complaintId(complaint.getComplaintId())
                .bookingId(complaint.getBookingId())
                .guestId(complaint.getGuestId())
                .hostId(complaint.getHostId())
                .listingId(complaint.getListingId())
                .type(complaint.getType())
                .status(complaint.getStatus())
                .description(complaint.getDescription())
                .evidenceUrls(deserializeEvidenceUrls(complaint.getEvidenceUrls()))
                .hostResponse(complaint.getHostResponse())
                .hostRespondedAt(complaint.getHostRespondedAt())
                .hostResponseDeadline(complaint.getHostResponseDeadline())
                .escalatedAt(complaint.getEscalatedAt())
                .adminNote(complaint.getAdminNote())
                .adminDecision(complaint.getAdminDecision())
                .refundAmount(complaint.getRefundAmount())
                .resolvedAt(complaint.getResolvedAt())
                .closedAt(complaint.getClosedAt())
                .createdAt(complaint.getCreatedAt())
                .updatedAt(complaint.getUpdatedAt())
                .build();
    }

    private void publishComplaintEvent(
            String eventType,
            BookingComplaint complaint,
            boolean guestRecipient,
            boolean hostRecipient,
            boolean adminRecipient
    ) {
        Map<String, Object> payload = Map.of(
                "complaintId", complaint.getComplaintId().toString(),
                "bookingId", complaint.getBookingId().toString(),
                "listingId", complaint.getListingId().toString(),
                "type", complaint.getType().name(),
                "status", complaint.getStatus().name()
        );
        if (guestRecipient) {
            notificationEventPublisher.publish(eventType, complaint.getGuestId(), "GUEST", payload);
        }
        if (hostRecipient) {
            notificationEventPublisher.publish(eventType, complaint.getHostId(), "HOST", payload);
        }
        if (adminRecipient) {
            notificationEventPublisher.publishToRole(eventType, "ADMIN", payload);
        }
    }

    private void publishBookingCancelledByAdmin(Booking booking) {
        Map<String, Object> payload = bookingPayload(booking);
        notificationEventPublisher.publish("BOOKING_CANCELLED_BY_ADMIN", booking.getGuestId(), "GUEST", payload);
        if (booking.getHostId() != null) {
            notificationEventPublisher.publish("BOOKING_CANCELLED_BY_ADMIN", booking.getHostId(), "HOST", payload);
        }
        notificationEventPublisher.publishToRole("BOOKING_CANCELLED_BY_ADMIN", "ADMIN", payload);
    }

    private void publishRefundCreated(Booking booking, BigDecimal amount, String businessCause, UUID businessCauseId) {
        notificationEventPublisher.publish(
                "REFUND_CREATED",
                booking.getGuestId(),
                "GUEST",
                Map.of(
                        "bookingId", booking.getBookingId().toString(),
                        "refundAmount", amount,
                        "currency", booking.getCurrency(),
                        "businessCause", businessCause,
                        "businessCauseId", businessCauseId.toString()
                )
        );
    }

    private void publishListingEvent(String eventType, UUID listingId, UUID hostId) {
        Map<String, Object> payload = Map.of("listingId", listingId.toString());
        if (hostId != null) {
            notificationEventPublisher.publish(eventType, hostId, "HOST", payload);
        }
        notificationEventPublisher.publishToRole(eventType, "ADMIN", payload);
    }

    private UUID resolveListingHostId(String bearerToken, UUID listingId) {
        try {
            var response = listingClient.getListingById(bearerToken, listingId);
            if (response == null || response.getData() == null || response.getData().getHostId() == null) {
                return null;
            }
            return UUID.fromString(response.getData().getHostId());
        } catch (RuntimeException ex) {
            log.warn("Failed to resolve host for listing notification listingId={}", listingId, ex);
            return null;
        }
    }

    private Map<String, Object> bookingPayload(Booking booking) {
        return Map.of(
                "bookingId", booking.getBookingId().toString(),
                "listingId", booking.getListingId().toString(),
                "guestId", booking.getGuestId().toString(),
                "hostId", booking.getHostId() != null ? booking.getHostId().toString() : "",
                "status", booking.getStatus().name(),
                "checkInDate", booking.getCheckInDate().toString(),
                "checkOutDate", booking.getCheckOutDate().toString(),
                "totalAmount", booking.getTotalPrice(),
                "currency", booking.getCurrency()
        );
    }

    private Jwt currentJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return (Jwt) authentication.getPrincipal();
    }

    private void requireAdmin(Jwt jwt) {
        if (!isAdmin(jwt)) {
            throw BusinessException.forbidden("Admin role is required");
        }
    }

    private boolean isAdmin(Jwt jwt) {
        Object realmAccess = jwt.getClaims().get("realm_access");
        if (!(realmAccess instanceof Map<?, ?> realmAccessMap)) {
            return false;
        }
        Object roles = realmAccessMap.get("roles");
        if (!(roles instanceof Collection<?> roleCollection)) {
            return false;
        }
        return roleCollection.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .anyMatch(role -> role.equals("ADMIN") || role.equals("ROLE_ADMIN"));
    }
}
