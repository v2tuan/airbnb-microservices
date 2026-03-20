package com.listingservice.controller;

import com.listingservice.dto.request.ListingCreationRequest;
import com.listingservice.dto.request.ListingUpdateRequest;
import com.listingservice.dto.response.ApiResponse;
import com.listingservice.dto.response.ListingResponse;
import com.listingservice.dto.response.HomeSectionResponse;
import com.listingservice.service.IListingService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/listings")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingController {

    IListingService listingService;

    @PostMapping
    public ResponseEntity<ApiResponse<ListingResponse>> createListing(
            @Valid @RequestBody ListingCreationRequest request) {
        log.info("REST request to create listing: {}", request.getTitle());
        ListingResponse response = listingService.createListing(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<ListingResponse>builder()
                        .code(1000)
                        .message("Listing created successfully")
                        .result(response)
                        .build());
    }

    @PutMapping("/{listingId}")
    public ResponseEntity<ApiResponse<ListingResponse>> updateListing(
            @PathVariable UUID listingId,
            @Valid @RequestBody ListingUpdateRequest request) {
        log.info("REST request to update listing ID: {}", listingId);
        ListingResponse response = listingService.updateListing(listingId, request);
        return ResponseEntity.ok(
                ApiResponse.<ListingResponse>builder()
                        .code(1000)
                        .message("Listing updated successfully")
                        .result(response)
                        .build());
    }

    @DeleteMapping("/{listingId}")
    public ResponseEntity<ApiResponse<Void>> deleteListing(@PathVariable UUID listingId) {
        log.info("REST request to delete listing ID: {}", listingId);
        listingService.deleteListing(listingId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Listing deleted successfully")
                        .build());
    }

    @GetMapping("/{listingId}")
    public ResponseEntity<ApiResponse<ListingResponse>> getListingById(@PathVariable UUID listingId) {
        log.info("REST request to get listing ID: {}", listingId);
        ListingResponse response = listingService.getListingById(listingId);
        return ResponseEntity.ok(
                ApiResponse.<ListingResponse>builder()
                        .code(1000)
                        .message("Listing retrieved successfully")
                        .result(response)
                        .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ListingResponse>>> getAllListings() {
        log.info("REST request to get all listings");
        List<ListingResponse> response = listingService.getAllListings();
        return ResponseEntity.ok(
                ApiResponse.<List<ListingResponse>>builder()
                        .code(1000)
                        .message("Listings retrieved successfully")
                        .result(response)
                        .build());
    }

    @GetMapping("/host/{hostId}")
    public ResponseEntity<ApiResponse<List<ListingResponse>>> getListingsByHost(
            @PathVariable UUID hostId) {
        log.info("REST request to get listings by host ID: {}", hostId);
        List<ListingResponse> response = listingService.getListingsByHost(hostId);
        return ResponseEntity.ok(
                ApiResponse.<List<ListingResponse>>builder()
                        .code(1000)
                        .message("Host listings retrieved successfully")
                        .result(response)
                        .build());
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ListingResponse>>> searchListings(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Integer maxGuests) {
        log.info("REST request to search listings - City: {}, Country: {}, Max Guests: {}",
                city, country, maxGuests);
        List<ListingResponse> response = listingService.searchListings(city, country, maxGuests);
        return ResponseEntity.ok(
                ApiResponse.<List<ListingResponse>>builder()
                        .code(1000)
                        .message("Search results retrieved successfully")
                        .result(response)
                        .build());
    }

    @GetMapping("/search/price")
    public ResponseEntity<ApiResponse<List<ListingResponse>>> searchByPriceRange(
            @RequestParam BigDecimal minPrice,
            @RequestParam BigDecimal maxPrice) {
        log.info("REST request to search listings by price range: {} - {}", minPrice, maxPrice);
        List<ListingResponse> response = listingService.searchByPriceRange(minPrice, maxPrice);
        return ResponseEntity.ok(
                ApiResponse.<List<ListingResponse>>builder()
                        .code(1000)
                        .message("Price range search results retrieved successfully")
                        .result(response)
                        .build());
    }

    @GetMapping("/search/location")
    public ResponseEntity<ApiResponse<List<ListingResponse>>> searchByLocation(
            @RequestParam BigDecimal latitude,
            @RequestParam BigDecimal longitude,
            @RequestParam Double radius) {
        log.info("REST request to search listings by location - Lat: {}, Lng: {}, Radius: {}km",
                latitude, longitude, radius);
        List<ListingResponse> response = listingService.searchByLocation(latitude, longitude, radius);
        return ResponseEntity.ok(
                ApiResponse.<List<ListingResponse>>builder()
                        .code(1000)
                        .message("Location search results retrieved successfully")
                        .result(response)
                        .build());
    }

    @GetMapping("/sections")
        public ApiResponse<List<HomeSectionResponse>> getHomeSections(
                @RequestParam(required = false) Integer limit
        ) {
        return ApiResponse.<List<HomeSectionResponse>>builder()
                .result(listingService.getHomeSections(limit))
                .build();
        }       

    @PatchMapping("/{listingId}/activate")
    public ResponseEntity<ApiResponse<Void>> activateListing(@PathVariable UUID listingId) {
        log.info("REST request to activate listing ID: {}", listingId);
        listingService.activateListing(listingId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Listing activated successfully")
                        .build());
    }

    @PatchMapping("/{listingId}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateListing(@PathVariable UUID listingId) {
        log.info("REST request to deactivate listing ID: {}", listingId);
        listingService.deactivateListing(listingId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Listing deactivated successfully")
                        .build());
    }
}