package com.bookingservice.repository.client;

import com.bookingservice.dto.request.BookingRefundRequest;
import com.bookingservice.dto.response.RefundResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.UUID;

@FeignClient(name = "payment-refund-client", url = "${payments.refunds-url:http://localhost:8087/payments/api/v1/refunds}")
public interface PaymentClient {
    @PostMapping("/booking/{bookingId}")
    RefundResponse createBookingRefund(
            @RequestHeader("Authorization") String token,
            @PathVariable UUID bookingId,
            @RequestBody BookingRefundRequest request
    );
}
