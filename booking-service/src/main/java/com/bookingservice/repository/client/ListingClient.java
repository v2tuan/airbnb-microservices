package com.bookingservice.repository.client;

import com.bookingservice.dto.ApiResponse;
import com.bookingservice.dto.request.ListingSuspensionRequest;
import com.bookingservice.dto.request.ListingBatchRequest;
import com.bookingservice.dto.request.ListingUnsuspensionRequest;
import com.bookingservice.dto.response.ListingResponse;
import feign.QueryMap;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "listing-client", url = "${listings.url}")
public interface ListingClient {
    @GetMapping("/{listingId}")
    ApiResponse<ListingResponse> getListingById(@RequestHeader("Authorization") String token, @PathVariable UUID listingId);

    @PostMapping("/batch")
    ApiResponse<List<ListingResponse>> getListingsByIds(
            @RequestHeader("Authorization") String token,
            @RequestBody ListingBatchRequest request
    );

    /**
     * Lấy toàn bộ listing của một host để Booking Service tự aggregate scope "All listings".
     *
     * Nếu frontend tự gọi từng listing rồi Promise.all reservations, client sẽ phải tải nhiều
     * request, dễ gặp partial failure và không thể pagination đúng ở backend. Đưa bước này vào
     * backend giúp một request reservation có cùng một transaction/query scope rõ ràng.
     */
    @GetMapping("/host/{hostId}")
    ApiResponse<List<ListingResponse>> getListingsByHost(
            @RequestHeader("Authorization") String token,
            @PathVariable("hostId") String hostId
    );

    @PatchMapping("/{listingId}/suspend")
    ApiResponse<Void> suspendListing(
            @RequestHeader("Authorization") String token,
            @PathVariable UUID listingId,
            @RequestBody ListingSuspensionRequest request
    );

    @PatchMapping("/{listingId}/unsuspend")
    ApiResponse<Void> unsuspendListing(
            @RequestHeader("Authorization") String token,
            @PathVariable UUID listingId,
            @RequestBody ListingUnsuspensionRequest request
    );
}
