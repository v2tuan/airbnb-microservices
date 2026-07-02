package com.chatbotservice.client;

import com.chatbotservice.configuration.FeignConfig;
import com.chatbotservice.dto.listing.ApiResponse;
import com.chatbotservice.dto.listing.ListingAvailabilityResponse;
import com.chatbotservice.dto.listing.ListingFilterRequest;
import com.chatbotservice.dto.listing.ListingResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@FeignClient(name = "listing-service", path = "/listings", configuration = FeignConfig.class)
public interface ListingFeignClient {

    @GetMapping("/search")
    ApiResponse<List<ListingResponse>> searchListings(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Integer maxGuests,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    );

    @PostMapping("/search/filter")
    ApiResponse<List<ListingResponse>> searchListingsWithFilters(@RequestBody ListingFilterRequest request);

    @GetMapping("/{listingId}")
    ApiResponse<ListingResponse> getListingById(@PathVariable UUID listingId);

    @GetMapping("/{listingId}/availability/bookable")
    ApiResponse<ListingAvailabilityResponse> checkBookableAvailability(
            @PathVariable UUID listingId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    );
}
