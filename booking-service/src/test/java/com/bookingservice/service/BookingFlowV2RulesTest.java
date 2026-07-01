package com.bookingservice.service;

import com.bookingservice.constant.ListingStatus;
import com.bookingservice.dto.ApiResponse;
import com.bookingservice.dto.request.CreateBookingRequest;
import com.bookingservice.dto.request.UpdateBookingStatusRequest;
import com.bookingservice.dto.response.CreateBookingResponse;
import com.bookingservice.dto.response.HouseRulesResponse;
import com.bookingservice.dto.response.ListingPricingResponse;
import com.bookingservice.dto.response.ListingResponse;
import com.bookingservice.entity.Booking;
import com.bookingservice.entity.BookingStatus;
import com.bookingservice.exception.BusinessException;
import com.bookingservice.repository.BookingCancellationQuoteRepository;
import com.bookingservice.repository.BookingComplaintRepository;
import com.bookingservice.repository.BookingRepository;
import com.bookingservice.repository.HostCancellationQuoteRepository;
import com.bookingservice.repository.client.ListingClient;
import com.bookingservice.repository.client.PaymentClient;
import com.bookingservice.repository.client.UserClient;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingFlowV2RulesTest {
    private static final UUID GUEST_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID HOST_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID LISTING_ID = UUID.fromString("00000000-0000-0000-0000-000000000003");

    @Mock BookingRepository bookingRepository;
    @Mock BookingCancellationQuoteRepository cancellationQuoteRepository;
    @Mock BookingComplaintRepository complaintRepository;
    @Mock HostCancellationQuoteRepository hostCancellationQuoteRepository;
    @Mock ListingClient listingClient;
    @Mock PaymentClient paymentClient;
    @Mock UserClient userClient;
    @Mock HostPenaltyService hostPenaltyService;
    @Mock NotificationEventPublisher notificationEventPublisher;

    BookingService bookingService;

    @BeforeEach
    void setUp() {
        bookingService = new BookingService(
                bookingRepository,
                cancellationQuoteRepository,
                complaintRepository,
                hostCancellationQuoteRepository,
                listingClient,
                paymentClient,
                userClient,
                hostPenaltyService,
                notificationEventPublisher
        );
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(GUEST_ID.toString())
                .claim("realm_access", Map.of("roles", List.of("GUEST")))
                .build();
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(jwt, null));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void checkoutCreatesPendingPaymentHoldAndDoesNotCallPayment() {
        CreateBookingRequest request = CreateBookingRequest.builder()
                .roomId(LISTING_ID)
                .checkInDate(LocalDate.now().plusDays(10))
                .checkOutDate(LocalDate.now().plusDays(12))
                .currency("USD")
                .numberOfAdults(2)
                .build();
        when(bookingRepository.tryAcquireListingBookingLock(LISTING_ID.toString())).thenReturn(true);
        when(listingClient.getListingById("Bearer token", LISTING_ID))
                .thenReturn(ApiResponse.<ListingResponse>builder().data(activeListing()).build());
        when(bookingRepository.findConflictingBookings(eq(LISTING_ID), any(), any())).thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking booking = invocation.getArgument(0);
            booking.setBookingId(UUID.randomUUID());
            booking.setCreatedAt(LocalDateTime.now());
            booking.setUpdatedAt(LocalDateTime.now());
            booking.setExpiresAt(LocalDateTime.now().plusMinutes(15));
            return booking;
        });

        CreateBookingResponse response = bookingService.createBooking(request);

        ArgumentCaptor<Booking> bookingCaptor = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepository).save(bookingCaptor.capture());
        assertThat(response.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(bookingCaptor.getValue().getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(bookingCaptor.getValue().getTotalNights()).isEqualTo(2);
        verify(paymentClient, never()).createBookingRefund(any(), any(), any());
    }

    @Test
    void checkoutFailsFastWhenListingBookingLockIsBusy() {
        CreateBookingRequest request = CreateBookingRequest.builder()
                .roomId(LISTING_ID)
                .checkInDate(LocalDate.now().plusDays(10))
                .checkOutDate(LocalDate.now().plusDays(12))
                .currency("USD")
                .numberOfAdults(2)
                .build();
        when(bookingRepository.tryAcquireListingBookingLock(LISTING_ID.toString())).thenReturn(false);

        assertThatThrownBy(() -> bookingService.createBooking(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Another booking is being processed");

        verify(listingClient, never()).getListingById(any(), any());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void expirationChangesPendingPaymentToExpired() {
        Booking booking = booking(BookingStatus.PENDING_PAYMENT);
        booking.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(bookingRepository.findExpiredPendingForUpdate(any())).thenReturn(List.of(booking));

        int expired = bookingService.expirePendingBookings();

        assertThat(expired).isEqualTo(1);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        verify(bookingRepository).saveAll(List.of(booking));
    }

    @Test
    void lifecycleAllowsConfirmedToCheckedInToCheckedOutToCompleted() {
        invokeTransition(BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN);
        invokeTransition(BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT);
        invokeTransition(BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED);
    }

    @Test
    void cancellationAndAdminTransitionsFollowV2() {
        invokeTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED_BY_GUEST);
        invokeTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED_BY_HOST);
        invokeTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED_BY_ADMIN);
        invokeTransition(BookingStatus.CHECKED_IN, BookingStatus.CANCELLED_BY_ADMIN);

        assertThatThrownBy(() -> invokeTransition(BookingStatus.CHECKED_IN, BookingStatus.CANCELLED_BY_GUEST))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> invokeTransition(BookingStatus.COMPLETED, BookingStatus.CANCELLED_BY_ADMIN))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void paymentSuccessOnlyConfirmsPendingPayment() {
        Booking pending = booking(BookingStatus.PENDING_PAYMENT);
        when(bookingRepository.findByIdForUpdate(pending.getBookingId())).thenReturn(Optional.of(pending));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        bookingService.updateBookingStatus(pending.getBookingId(), UpdateBookingStatusRequest.builder()
                .status(BookingStatus.CONFIRMED)
                .paymentIntentId("pi_123")
                .build());

        assertThat(pending.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(pending.getPaymentIntentId()).isEqualTo("pi_123");
        assertThat(pending.getPaidAt()).isNotNull();
    }

    @Test
    void availabilityUsesV2BlockingStatesRepositoryQuery() {
        LocalDate checkIn = LocalDate.of(2026, 8, 1);
        LocalDate checkOut = LocalDate.of(2026, 8, 3);
        when(bookingRepository.findConflictingBookings(LISTING_ID, checkIn, checkOut)).thenReturn(List.of());

        assertThat(bookingService.isListingAvailable(LISTING_ID, checkIn, checkOut)).isTrue();

        Booking conflict = booking(BookingStatus.CONFIRMED);
        when(bookingRepository.findConflictingBookings(LISTING_ID, checkIn, checkOut)).thenReturn(List.of(conflict));

        assertThat(bookingService.isListingAvailable(LISTING_ID, checkIn, checkOut)).isFalse();
    }

    private void invokeTransition(BookingStatus from, BookingStatus to) {
        ReflectionTestUtils.invokeMethod(bookingService, "validateStatusTransition", from, to);
    }

    private Booking booking(BookingStatus status) {
        return Booking.builder()
                .bookingId(UUID.randomUUID())
                .listingId(LISTING_ID)
                .guestId(GUEST_ID)
                .hostId(HOST_ID)
                .checkInDate(LocalDate.now().plusDays(10))
                .checkOutDate(LocalDate.now().plusDays(12))
                .status(status)
                .currency("USD")
                .totalPrice(220)
                .build();
    }

    private ListingResponse activeListing() {
        return ListingResponse.builder()
                .listingId(LISTING_ID)
                .hostId(HOST_ID.toString())
                .status(ListingStatus.ACTIVE)
                .maxGuests(4)
                .pricing(ListingPricingResponse.builder()
                        .basePrice(BigDecimal.valueOf(100))
                        .cleaningFee(BigDecimal.valueOf(20))
                        .serviceFeePercentage(BigDecimal.TEN)
                        .currency("USD")
                        .build())
                .houseRules(HouseRulesResponse.builder().petsAllowed(false).build())
                .cancellationPolicyCode("FLEXIBLE")
                .build();
    }
}
