package com.listingservice.controller;

import com.listingservice.dto.request.ListingPricingRequest;
import com.listingservice.dto.response.ApiResponse;
import com.listingservice.dto.response.ListingPricingResponse;
import com.listingservice.service.IListingPricingService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/listings/{listingId}/pricing")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingPricingController {

    IListingPricingService listingPricingService;

    @PostMapping
    public ResponseEntity<ApiResponse<ListingPricingResponse>> createOrUpdatePricing(
            @PathVariable UUID listingId,
            @Valid @RequestBody ListingPricingRequest request) {
        log.info("REST request to create or update pricing for listing ID: {}", listingId);
        ListingPricingResponse response = listingPricingService.createOrUpdatePricing(listingId, request);
        return ResponseEntity.ok(
                ApiResponse.<ListingPricingResponse>builder()
                        .code(1000)
                        .message("Pricing saved successfully")
                        .result(response)
                        .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ListingPricingResponse>> getPricingByListing(
            @PathVariable UUID listingId) {
        log.info("REST request to get pricing for listing ID: {}", listingId);
        ListingPricingResponse response = listingPricingService.getPricingByListing(listingId);
        return ResponseEntity.ok(
                ApiResponse.<ListingPricingResponse>builder()
                        .code(1000)
                        .message("Pricing retrieved successfully")
                        .result(response)
                        .build());
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deletePricing(@PathVariable UUID listingId) {
        log.info("REST request to delete pricing for listing ID: {}", listingId);
        listingPricingService.deletePricing(listingId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Pricing deleted successfully")
                        .build());
    }
}
