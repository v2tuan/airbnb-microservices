package com.listingservice.controller;

import com.listingservice.dto.request.AvailabilityRequest;
import com.listingservice.dto.response.ApiResponse;
import com.listingservice.dto.response.AvailabilityResponse;
import com.listingservice.service.IAvailabilityCalendarService;
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
@RequestMapping("/listings/{listingId}/availability")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AvailabilityCalendarController {

    IAvailabilityCalendarService availabilityCalendarService;

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<AvailabilityResponse>> setAvailability(
            @PathVariable UUID listingId,
            @Valid @RequestBody AvailabilityRequest request) {
        log.info("REST request to set availability for listing ID: {}", listingId);
        AvailabilityResponse response = availabilityCalendarService.setAvailability(listingId, request);
        return ResponseEntity.ok(
                ApiResponse.<AvailabilityResponse>builder()
                        .code(1000)
                        .message("Availability set successfully")
                        .result(response)
                        .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AvailabilityResponse>>> getAvailability(
            @PathVariable UUID listingId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("REST request to get availability for listing ID: {} from {} to {}",
                listingId, startDate, endDate);
        List<AvailabilityResponse> response = availabilityCalendarService.getAvailability(
                listingId, startDate, endDate);
        return ResponseEntity.ok(
                ApiResponse.<List<AvailabilityResponse>>builder()
                        .code(1000)
                        .message("Availability retrieved successfully")
                        .result(response)
                        .build());
    }

    @GetMapping("/check")
    public ResponseEntity<ApiResponse<Boolean>> checkAvailability(
            @PathVariable UUID listingId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("REST request to check availability for listing ID: {} from {} to {}",
                listingId, startDate, endDate);
        boolean isAvailable = availabilityCalendarService.checkAvailability(listingId, startDate, endDate);
        return ResponseEntity.ok(
                ApiResponse.<Boolean>builder()
                        .code(1000)
                        .message("Availability checked successfully")
                        .result(isAvailable)
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PostMapping("/block")
    public ResponseEntity<ApiResponse<Void>> blockDates(
            @PathVariable UUID listingId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("REST request to block dates for listing ID: {} from {} to {}",
                listingId, startDate, endDate);
        availabilityCalendarService.blockDates(listingId, startDate, endDate);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Dates blocked successfully")
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PostMapping("/unblock")
    public ResponseEntity<ApiResponse<Void>> unblockDates(
            @PathVariable UUID listingId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("REST request to unblock dates for listing ID: {} from {} to {}",
                listingId, startDate, endDate);
        availabilityCalendarService.unblockDates(listingId, startDate, endDate);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Dates unblocked successfully")
                        .build());
    }
}
