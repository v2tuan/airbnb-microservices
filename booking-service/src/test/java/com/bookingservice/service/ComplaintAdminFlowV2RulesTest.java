package com.bookingservice.service;

import com.bookingservice.dto.request.AdminComplaintDecisionRequest;
import com.bookingservice.dto.request.BookingRefundRequest;
import com.bookingservice.dto.request.CreateComplaintRequest;
import com.bookingservice.dto.response.RefundResponse;
import com.bookingservice.entity.AdminComplaintDecision;
import com.bookingservice.entity.Booking;
import com.bookingservice.entity.BookingComplaint;
import com.bookingservice.entity.BookingStatus;
import com.bookingservice.entity.ComplaintStatus;
import com.bookingservice.entity.ComplaintType;
import com.bookingservice.repository.BookingComplaintRepository;
import com.bookingservice.repository.BookingRepository;
import com.bookingservice.repository.client.ListingClient;
import com.bookingservice.repository.client.PaymentClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ComplaintAdminFlowV2RulesTest {
    private static final UUID BOOKING_ID = UUID.fromString("00000000-0000-0000-0000-000000000011");
    private static final UUID GUEST_ID = UUID.fromString("00000000-0000-0000-0000-000000000012");
    private static final UUID HOST_ID = UUID.fromString("00000000-0000-0000-0000-000000000013");
    private static final UUID LISTING_ID = UUID.fromString("00000000-0000-0000-0000-000000000014");

    @Mock BookingComplaintRepository complaintRepository;
    @Mock BookingRepository bookingRepository;
    @Mock PaymentClient paymentClient;
    @Mock ListingClient listingClient;
    @Mock NotificationEventPublisher notificationEventPublisher;

    ComplaintService complaintService;

    @BeforeEach
    void setUp() {
        complaintService = new ComplaintService(
                complaintRepository,
                bookingRepository,
                paymentClient,
                listingClient,
                notificationEventPublisher
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void guestCanCreateComplaintOnlyForCheckedInBooking() {
        setJwt(GUEST_ID, "GUEST");
        Booking booking = checkedInBooking();
        when(bookingRepository.findByIdForUpdate(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(complaintRepository.existsByBookingIdAndStatusIn(any(), any())).thenReturn(false);
        when(complaintRepository.save(any(BookingComplaint.class))).thenAnswer(invocation -> {
            BookingComplaint complaint = invocation.getArgument(0);
            complaint.setComplaintId(UUID.randomUUID());
            return complaint;
        });

        CreateComplaintRequest request = new CreateComplaintRequest();
        request.setType(ComplaintType.SAFETY_ISSUE);
        request.setDescription("Door lock is broken");

        var response = complaintService.createComplaint(BOOKING_ID, request);

        assertThat(response.getStatus()).isEqualTo(ComplaintStatus.WAITING_HOST_RESPONSE);
        assertThat(response.getType()).isEqualTo(ComplaintType.SAFETY_ISSUE);
        verify(notificationEventPublisher).publish(
                org.mockito.ArgumentMatchers.eq("COMPLAINT_CREATED"),
                org.mockito.ArgumentMatchers.eq(HOST_ID),
                org.mockito.ArgumentMatchers.eq("HOST"),
                org.mockito.ArgumentMatchers.anyMap()
        );
    }

    @Test
    void adminFullRefundComplaintCancelsCheckedInBookingByAdmin() {
        setJwt(UUID.fromString("00000000-0000-0000-0000-000000000099"), "ADMIN");
        Booking booking = checkedInBooking();
        BookingComplaint complaint = BookingComplaint.builder()
                .complaintId(UUID.randomUUID())
                .bookingId(BOOKING_ID)
                .guestId(GUEST_ID)
                .hostId(HOST_ID)
                .listingId(LISTING_ID)
                .type(ComplaintType.SAFETY_ISSUE)
                .status(ComplaintStatus.ESCALATED_TO_ADMIN)
                .description("Unsafe")
                .build();
        when(complaintRepository.findByIdForUpdate(complaint.getComplaintId())).thenReturn(Optional.of(complaint));
        when(bookingRepository.findByIdForUpdate(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(paymentClient.createBookingRefund(any(), any(), any())).thenReturn(new RefundResponse());
        when(complaintRepository.save(any(BookingComplaint.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminComplaintDecisionRequest request = new AdminComplaintDecisionRequest();
        request.setDecision(AdminComplaintDecision.FULL_REFUND);
        request.setAdminNote("Safety issue confirmed");

        var response = complaintService.decideComplaint(complaint.getComplaintId(), request);

        ArgumentCaptor<BookingRefundRequest> refundCaptor = ArgumentCaptor.forClass(BookingRefundRequest.class);
        verify(paymentClient).createBookingRefund(any(), any(), refundCaptor.capture());
        assertThat(response.getStatus()).isEqualTo(ComplaintStatus.RESOLVED);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED_BY_ADMIN);
        assertThat(refundCaptor.getValue().getBusinessCause()).isEqualTo("COMPLAINT_DECISION");
    }

    private Booking checkedInBooking() {
        return Booking.builder()
                .bookingId(BOOKING_ID)
                .guestId(GUEST_ID)
                .hostId(HOST_ID)
                .listingId(LISTING_ID)
                .status(BookingStatus.CHECKED_IN)
                .checkInDate(java.time.LocalDate.now())
                .checkOutDate(java.time.LocalDate.now().plusDays(2))
                .checkedInAt(java.time.LocalDateTime.now().minusHours(1))
                .totalPrice(300)
                .currency("USD")
                .build();
    }

    private void setJwt(UUID subject, String role) {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(subject.toString())
                .claim("realm_access", Map.of("roles", List.of(role)))
                .build();
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(jwt, null));
    }
}
