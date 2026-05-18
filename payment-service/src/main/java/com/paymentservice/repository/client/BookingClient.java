package com.paymentservice.repository.client;

import com.paymentservice.dto.request.CreateBookingRequest;
import com.paymentservice.dto.request.UpdateBookingStatusRequest;
import com.paymentservice.dto.response.BookingResponse;
import com.paymentservice.dto.response.CreateBookingResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@FeignClient(name = "booking-client", url = "http://localhost:8086/bookings")
public interface BookingClient {
    @PostMapping(value = "/")
    CreateBookingResponse createBooking(@RequestBody CreateBookingRequest request);

    @PostMapping(value = "/{id}/status")
    BookingResponse updateBookingStatus (@RequestHeader("authorization") String token,
                                         @PathVariable UUID id,
                                         @RequestBody UpdateBookingStatusRequest request);
}
