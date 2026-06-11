package com.paymentservice.repository.client;

import com.paymentservice.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "user-service", path = "/users")
public interface UserClient {
    @GetMapping(value = "/stripe/{hostId}")
    ApiResponse<String> getStripeAccountId(@PathVariable String hostId);
}
