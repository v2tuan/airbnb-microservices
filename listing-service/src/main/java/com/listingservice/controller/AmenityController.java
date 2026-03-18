package com.listingservice.controller;

import com.listingservice.dto.request.AmenityRequest;
import com.listingservice.dto.response.AmenityResponse;
import com.listingservice.dto.response.ApiResponse;
import com.listingservice.service.IAmenityService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/amenities")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AmenityController {

    IAmenityService amenityService;

    @PostMapping
    public ResponseEntity<ApiResponse<AmenityResponse>> createAmenity(
            @Valid @RequestBody AmenityRequest request) {
        log.info("REST request to create amenity: {}", request.getName());
        AmenityResponse response = amenityService.createAmenity(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<AmenityResponse>builder()
                        .code(1000)
                        .message("Amenity created successfully")
                        .result(response)
                        .build());
    }

    @PutMapping("/{amenityId}")
    public ResponseEntity<ApiResponse<AmenityResponse>> updateAmenity(
            @PathVariable UUID amenityId,
            @Valid @RequestBody AmenityRequest request) {
        log.info("REST request to update amenity ID: {}", amenityId);
        AmenityResponse response = amenityService.updateAmenity(amenityId, request);
        return ResponseEntity.ok(
                ApiResponse.<AmenityResponse>builder()
                        .code(1000)
                        .message("Amenity updated successfully")
                        .result(response)
                        .build());
    }

    @DeleteMapping("/{amenityId}")
    public ResponseEntity<ApiResponse<Void>> deleteAmenity(@PathVariable UUID amenityId) {
        log.info("REST request to delete amenity ID: {}", amenityId);
        amenityService.deleteAmenity(amenityId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Amenity deleted successfully")
                        .build());
    }

    @GetMapping("/{amenityId}")
    public ResponseEntity<ApiResponse<AmenityResponse>> getAmenityById(@PathVariable UUID amenityId) {
        log.info("REST request to get amenity ID: {}", amenityId);
        AmenityResponse response = amenityService.getAmenityById(amenityId);
        return ResponseEntity.ok(
                ApiResponse.<AmenityResponse>builder()
                        .code(1000)
                        .message("Amenity retrieved successfully")
                        .result(response)
                        .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AmenityResponse>>> getAllAmenities() {
        log.info("REST request to get all amenities");
        List<AmenityResponse> response = amenityService.getAllAmenities();
        return ResponseEntity.ok(
                ApiResponse.<List<AmenityResponse>>builder()
                        .code(1000)
                        .message("Amenities retrieved successfully")
                        .result(response)
                        .build());
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<ApiResponse<List<AmenityResponse>>> getAmenitiesByCategory(
            @PathVariable String category) {
        log.info("REST request to get amenities by category: {}", category);
        List<AmenityResponse> response = amenityService.getAmenitiesByCategory(category);
        return ResponseEntity.ok(
                ApiResponse.<List<AmenityResponse>>builder()
                        .code(1000)
                        .message("Amenities retrieved successfully")
                        .result(response)
                        .build());
    }
}
