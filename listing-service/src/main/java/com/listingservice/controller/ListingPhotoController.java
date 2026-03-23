package com.listingservice.controller;

import com.listingservice.dto.request.ListingPhotoRequest;
import com.listingservice.dto.response.ApiResponse;
import com.listingservice.dto.response.ListingPhotoResponse;
import com.listingservice.service.IListingPhotoService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/listings/{listingId}/photos")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingPhotoController {

    IListingPhotoService listingPhotoService;

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<ApiResponse<ListingPhotoResponse>> addPhoto(
            @PathVariable UUID listingId,
            @Valid @RequestBody ListingPhotoRequest request) {
        log.info("REST request to add photo to listing ID: {}", listingId);
        ListingPhotoResponse response = listingPhotoService.addPhoto(listingId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<ListingPhotoResponse>builder()
                        .code(1000)
                        .message("Photo added successfully")
                        .result(response)
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PutMapping("/{photoId}")
    public ResponseEntity<ApiResponse<ListingPhotoResponse>> updatePhoto(
            @PathVariable UUID listingId,
            @PathVariable UUID photoId,
            @Valid @RequestBody ListingPhotoRequest request) {
        log.info("REST request to update photo ID: {} for listing ID: {}", photoId, listingId);
        ListingPhotoResponse response = listingPhotoService.updatePhoto(photoId, request);
        return ResponseEntity.ok(
                ApiResponse.<ListingPhotoResponse>builder()
                        .code(1000)
                        .message("Photo updated successfully")
                        .result(response)
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @DeleteMapping("/{photoId}")
    public ResponseEntity<ApiResponse<Void>> deletePhoto(
            @PathVariable UUID listingId,
            @PathVariable UUID photoId) {
        log.info("REST request to delete photo ID: {} from listing ID: {}", photoId, listingId);
        listingPhotoService.deletePhoto(photoId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Photo deleted successfully")
                        .build());
    }

    @GetMapping("/{photoId}")
    public ResponseEntity<ApiResponse<ListingPhotoResponse>> getPhotoById(
            @PathVariable UUID listingId,
            @PathVariable UUID photoId) {
        log.info("REST request to get photo ID: {} from listing ID: {}", photoId, listingId);
        ListingPhotoResponse response = listingPhotoService.getPhotoById(photoId);
        return ResponseEntity.ok(
                ApiResponse.<ListingPhotoResponse>builder()
                        .code(1000)
                        .message("Photo retrieved successfully")
                        .result(response)
                        .build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ListingPhotoResponse>>> getPhotosByListing(
            @PathVariable UUID listingId) {
        log.info("REST request to get photos for listing ID: {}", listingId);
        List<ListingPhotoResponse> response = listingPhotoService.getPhotosByListing(listingId);
        return ResponseEntity.ok(
                ApiResponse.<List<ListingPhotoResponse>>builder()
                        .code(1000)
                        .message("Photos retrieved successfully")
                        .result(response)
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PatchMapping("/{photoId}/set-cover")
    public ResponseEntity<ApiResponse<Void>> setCoverPhoto(
            @PathVariable UUID listingId,
            @PathVariable UUID photoId) {
        log.info("REST request to set photo ID: {} as cover for listing ID: {}", photoId, listingId);
        listingPhotoService.setCoverPhoto(listingId, photoId);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Cover photo set successfully")
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PutMapping("/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderPhotos(
            @PathVariable UUID listingId,
            @RequestBody List<UUID> photoIds) {
        log.info("REST request to reorder photos for listing ID: {}", listingId);
        listingPhotoService.reorderPhotos(listingId, photoIds);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Photos reordered successfully")
                        .build());
    }
}
