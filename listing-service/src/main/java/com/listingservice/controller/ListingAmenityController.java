package com.listingservice.controller;

import com.listingservice.dto.response.AmenityResponse;
import com.listingservice.dto.response.ApiResponse;
import com.listingservice.service.IListingAmenityService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/listings/{listingId}/amenities")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingAmenityController {

    IListingAmenityService listingAmenityService;

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PostMapping("/{amenityId}")
    public ResponseEntity<ApiResponse<Void>> addAmenityToListing(
            @PathVariable UUID listingId,
            @PathVariable UUID amenityId) {
        log.info("REST request to add amenity ID: {} to listing ID: {}", amenityId, listingId);
        listingAmenityService.addAmenityToListing(listingId, amenityId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Amenity added to listing successfully")
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @DeleteMapping("/{amenityId}")
    public ResponseEntity<ApiResponse<Void>> removeAmenityFromListing(
            @PathVariable UUID listingId,
            @PathVariable UUID amenityId) {
        log.info("REST request to remove amenity ID: {} from listing ID: {}", amenityId, listingId);
        listingAmenityService.removeAmenityFromListing(listingId, amenityId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Amenity removed from listing successfully")
                        .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AmenityResponse>>> getListingAmenities(
            @PathVariable UUID listingId) {
        log.info("REST request to get amenities for listing ID: {}", listingId);
        List<AmenityResponse> response = listingAmenityService.getListingAmenities(listingId);
        return ResponseEntity.ok(
                ApiResponse.<List<AmenityResponse>>builder()
                        .code(1000)
                        .message("Listing amenities retrieved successfully")
                        .result(response)
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PutMapping
    public ResponseEntity<ApiResponse<Void>> updateListingAmenities(
            @PathVariable UUID listingId,
            @RequestBody List<UUID> amenityIds) {
        log.info("REST request to update amenities for listing ID: {}", listingId);
        listingAmenityService.updateListingAmenities(listingId, amenityIds);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Listing amenities updated successfully")
                        .build());
    }
}
