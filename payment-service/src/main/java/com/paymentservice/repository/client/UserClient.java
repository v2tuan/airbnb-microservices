package com.paymentservice.repository.client;

import com.paymentservice.dto.ApiResponse;
import com.paymentservice.dto.request.CreateBookingRequest;
import com.paymentservice.dto.request.UpdateBookingStatusRequest;
import com.paymentservice.dto.response.BookingResponse;
import com.paymentservice.dto.response.CreateBookingResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@FeignClient(name = "user-client", url = "http://localhost:8082/users")
public interface UserClient {
    @GetMapping(value = "/stripe/{hostId}")
    ApiResponse<String> getStripeAccountId(@PathVariable String hostId);
}
