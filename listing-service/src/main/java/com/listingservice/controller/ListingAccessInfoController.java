package com.listingservice.controller;

import com.listingservice.dto.request.ListingAccessInfoRequest;
import com.listingservice.dto.response.ApiResponse;
import com.listingservice.dto.response.ListingAccessInfoResponse;
import com.listingservice.service.IListingAccessInfoService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/listings/{listingId}/access-info")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingAccessInfoController {

    IListingAccessInfoService accessInfoService;

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<ListingAccessInfoResponse>> createOrUpdateAccessInfo(
            @PathVariable UUID listingId,
            @Valid @RequestBody ListingAccessInfoRequest request) {
        log.info("REST request to create or update access info for listing ID: {}", listingId);
        ListingAccessInfoResponse response = accessInfoService.createOrUpdateAccessInfo(listingId, request);
        return ResponseEntity.ok(ApiResponse.<ListingAccessInfoResponse>builder()
                .code(1000)
                .message("Access info saved successfully")
                .data(response)
                .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @GetMapping
    public ResponseEntity<ApiResponse<ListingAccessInfoResponse>> getAccessInfoByListing(
            @PathVariable UUID listingId) {
        ListingAccessInfoResponse response = accessInfoService.getAccessInfoByListing(listingId);
        return ResponseEntity.ok(ApiResponse.<ListingAccessInfoResponse>builder()
                .code(1000)
                .message("Access info retrieved successfully")
                .data(response)
                .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteAccessInfo(@PathVariable UUID listingId) {
        accessInfoService.deleteAccessInfo(listingId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .code(1000)
                .message("Access info deleted successfully")
                .build());
    }
}
