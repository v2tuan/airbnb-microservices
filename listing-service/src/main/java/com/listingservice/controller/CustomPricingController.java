package com.listingservice.controller;

import com.listingservice.dto.request.CustomPricingRequest;
import com.listingservice.dto.response.ApiResponse;
import com.listingservice.dto.response.CustomPricingResponse;
import com.listingservice.service.ICustomPricingService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/listings/{listingId}/custom-pricing")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class CustomPricingController {

    ICustomPricingService customPricingService;

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<CustomPricingResponse>> setCustomPricing(
            @PathVariable UUID listingId,
            @Valid @RequestBody CustomPricingRequest request) {
        log.info("REST request to set custom pricing for listing ID: {}", listingId);
        CustomPricingResponse response = customPricingService.setCustomPricing(listingId, request);
        return ResponseEntity.ok(
                ApiResponse.<CustomPricingResponse>builder()
                        .code(1000)
                        .message("Custom pricing set successfully")
                        .result(response)
                        .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CustomPricingResponse>>> getCustomPricing(
            @PathVariable UUID listingId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("REST request to get custom pricing for listing ID: {} from {} to {}",
                listingId, startDate, endDate);
        List<CustomPricingResponse> response = customPricingService.getCustomPricing(
                listingId, startDate, endDate);
        return ResponseEntity.ok(
                ApiResponse.<List<CustomPricingResponse>>builder()
                        .code(1000)
                        .message("Custom pricing retrieved successfully")
                        .result(response)
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteCustomPricing(
            @PathVariable UUID listingId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.info("REST request to delete custom pricing for listing ID: {} on {}", listingId, date);
        customPricingService.deleteCustomPricing(listingId, date);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Custom pricing deleted successfully")
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @DeleteMapping("/all")
    public ResponseEntity<ApiResponse<Void>> deleteAllCustomPricing(@PathVariable UUID listingId) {
        log.info("REST request to delete all custom pricing for listing ID: {}", listingId);
        customPricingService.deleteAllCustomPricing(listingId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("All custom pricing deleted successfully")
                        .build());
    }
}
