package com.chatbotservice.client;

import com.chatbotservice.configuration.FeignConfig;
import com.chatbotservice.dto.listing.ApiResponse;
import com.chatbotservice.dto.listing.ListingResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.List;

@FeignClient(name = "listing-service", path = "/listings", configuration = FeignConfig.class)
public interface ListingFeignClient {

    @GetMapping("/search")
    ApiResponse<List<ListingResponse>> searchListings(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Integer maxGuests,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    );
}
