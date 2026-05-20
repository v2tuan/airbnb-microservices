package com.listingservice.controller;

import com.listingservice.dto.request.HouseRulesRequest;
import com.listingservice.dto.response.ApiResponse;
import com.listingservice.dto.response.HouseRulesResponse;
import com.listingservice.service.IHouseRulesService;
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
@RequestMapping("/listings/{listingId}/house-rules")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class HouseRulesController {

    IHouseRulesService houseRulesService;

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<HouseRulesResponse>> createOrUpdateHouseRules(
            @PathVariable UUID listingId,
            @Valid @RequestBody HouseRulesRequest request) {
        log.info("REST request to create or update house rules for listing ID: {}", listingId);
        HouseRulesResponse response = houseRulesService.createOrUpdateHouseRules(listingId, request);
        return ResponseEntity.ok(
                ApiResponse.<HouseRulesResponse>builder()
                        .code(1000)
                        .message("House rules saved successfully")
                        .data(response)
                        .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<HouseRulesResponse>> getHouseRulesByListing(
            @PathVariable UUID listingId) {
        log.info("REST request to get house rules for listing ID: {}", listingId);
        HouseRulesResponse response = houseRulesService.getHouseRulesByListing(listingId);
        return ResponseEntity.ok(
                ApiResponse.<HouseRulesResponse>builder()
                        .code(1000)
                        .message("House rules retrieved successfully")
                        .data(response)
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteHouseRules(@PathVariable UUID listingId) {
        log.info("REST request to delete house rules for listing ID: {}", listingId);
        houseRulesService.deleteHouseRules(listingId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("House rules deleted successfully")
                        .build());
    }
}
