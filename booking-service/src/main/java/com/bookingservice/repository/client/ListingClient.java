package com.bookingservice.repository.client;

import com.bookingservice.dto.ApiResponse;
import com.bookingservice.dto.response.ListingResponse;
import feign.QueryMap;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@FeignClient(name = "listing-client", url = "${listings.url}")
public interface ListingClient {
    @GetMapping("/{listingId}")
    ApiResponse<ListingResponse> getListingById(@PathVariable UUID listingId);
}
