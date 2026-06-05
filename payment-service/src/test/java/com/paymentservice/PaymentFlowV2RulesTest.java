package com.paymentservice;

import com.paymentservice.config.StripeConfig;
import com.paymentservice.dto.request.BookingStatus;
import com.paymentservice.dto.request.UpdateBookingStatusRequest;
import com.paymentservice.dto.response.BookingResponse;
import com.paymentservice.entity.PaymentStatus;
import com.paymentservice.entity.RefundBusinessCause;
import com.paymentservice.entity.RefundStatus;
import com.paymentservice.mapper.BookingMapper;
import com.paymentservice.repository.PaymentAuditLogRepository;
import com.paymentservice.repository.PaymentRepository;
import com.paymentservice.repository.PayoutRepository;
import com.paymentservice.repository.StripeWebhookEventRepository;
import com.paymentservice.repository.TransactionRepository;
import com.paymentservice.repository.client.BookingClient;
import com.paymentservice.repository.client.UserClient;
import com.paymentservice.service.PaymentEventPublisher;
import com.paymentservice.service.PaymentService;
import com.paymentservice.service.ServiceTokenProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Arrays;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentFlowV2RulesTest {
    @Mock PaymentRepository paymentRepository;
    @Mock StripeConfig stripeConfig;
    @Mock BookingClient bookingClient;
    @Mock BookingMapper bookingMapper;
    @Mock UserClient userClient;
    @Mock ServiceTokenProvider serviceTokenProvider;
    @Mock StripeWebhookEventRepository webhookEventRepository;
    @Mock TransactionRepository transactionRepository;
    @Mock PayoutRepository payoutRepository;
    @Mock PaymentAuditLogRepository auditLogRepository;
    @Mock PaymentEventPublisher eventPublisher;

    @Test
    void paymentSuccessConfirmsOnlyPendingPaymentBooking() {
        UUID bookingId = UUID.randomUUID();
        PaymentService service = new PaymentService(
                paymentRepository,
                stripeConfig,
                bookingClient,
                bookingMapper,
                userClient,
                serviceTokenProvider,
                webhookEventRepository,
                transactionRepository,
                payoutRepository,
                auditLogRepository,
                eventPublisher
        );
        when(serviceTokenProvider.bearerToken()).thenReturn("Bearer service");
        when(bookingClient.getBooking("Bearer service", bookingId))
                .thenReturn(BookingResponse.builder().status(BookingStatus.PENDING_PAYMENT).build());
        when(bookingClient.updateBookingStatus(org.mockito.ArgumentMatchers.eq("Bearer service"),
                org.mockito.ArgumentMatchers.eq(bookingId),
                org.mockito.ArgumentMatchers.any(UpdateBookingStatusRequest.class)))
                .thenReturn(BookingResponse.builder().status(BookingStatus.CONFIRMED).build());

        BookingResponse response = ReflectionTestUtils.invokeMethod(service, "confirmBookingIfPending", bookingId, "pi_123");

        ArgumentCaptor<UpdateBookingStatusRequest> requestCaptor = ArgumentCaptor.forClass(UpdateBookingStatusRequest.class);
        verify(bookingClient).updateBookingStatus(org.mockito.ArgumentMatchers.eq("Bearer service"),
                org.mockito.ArgumentMatchers.eq(bookingId),
                requestCaptor.capture());
        assertThat(response.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(requestCaptor.getValue().getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(requestCaptor.getValue().getPaymentIntentId()).isEqualTo("pi_123");
    }

    @Test
    void statusEnumsUseBookingAndPaymentV2() {
        assertThat(Arrays.asList(BookingStatus.values()))
                .extracting(Enum::name)
                .doesNotContain("PAID", "CANCELLED")
                .contains("PENDING_PAYMENT", "CONFIRMED", "CANCELLED_BY_ADMIN");

        assertThat(Arrays.asList(PaymentStatus.values()))
                .extracting(Enum::name)
                .containsExactly(
                        "PAYMENT_PENDING",
                        "PAID",
                        "PAYMENT_FAILED",
                        "PAYMENT_CANCELLED",
                        "REFUND_PENDING",
                        "PARTIALLY_REFUNDED",
                        "REFUNDED",
                        "REFUND_FAILED"
                );

        assertThat(Arrays.asList(RefundStatus.values()))
                .extracting(Enum::name)
                .containsExactly("PENDING", "PROCESSING", "COMPLETED", "FAILED");

        assertThat(Arrays.asList(RefundBusinessCause.values()))
                .extracting(Enum::name)
                .containsExactly("CANCELLATION_QUOTE", "COMPLAINT_DECISION", "ADMIN_FORCE_CANCELLATION");
    }
}
