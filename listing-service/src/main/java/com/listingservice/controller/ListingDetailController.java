package com.listingservice.controller;

import com.listingservice.constant.ListingStatus;
import com.listingservice.dto.request.ListingBatchRequest;
import com.listingservice.dto.request.ListingCreationRequest;
import com.listingservice.dto.request.ListingUpdateRequest;
import com.listingservice.dto.response.ApiResponse;
import com.listingservice.dto.response.CompositeListingResponse;
import com.listingservice.dto.response.HomeSectionResponse;
import com.listingservice.dto.response.ListingItemResponse;
import com.listingservice.dto.response.ListingResponse;
import com.listingservice.service.IListingService;
import com.listingservice.service.Impl.ListingDetailService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/listings")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingDetailController {

    IListingService listingService;
    private final ListingDetailService listingDetailService;

    @PreAuthorize("hasAuthority('ROLE_HOST')")
    @PostMapping
    public ResponseEntity<ApiResponse<ListingResponse>> createListing(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ListingCreationRequest request) {
        log.info("REST request to create listing: {}", request.getTitle());

        String keycloakUserId = jwt.getSubject();
        log.debug("Creating listing for host: {}", keycloakUserId);

        ListingResponse response = listingService.createListing(request, keycloakUserId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<ListingResponse>builder()
                        .code(1000)
                        .message("Listing created successfully")
                        .result(response)
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
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

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
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

    /**
     * Batch API cho microservices (BookingService, PaymentService,...)
     */
    @PostMapping("/batch")
    public ResponseEntity<ApiResponse<List<ListingResponse>>> getListingsByIds(
            @RequestBody ListingBatchRequest request
    ) {
        log.info("Internal batch listing request: {}", request.listingIds().size());

        return ResponseEntity.ok(ApiResponse.<List<ListingResponse>>builder()
                .result(listingService.getListingsByIds(request.listingIds()))
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
    public ResponseEntity<ApiResponse<List<ListingResponse>>> getListingsByHost(@PathVariable String hostId) {
        log.info("REST request to get listings by host ID: {}", hostId);
        List<ListingResponse> response = listingService.getListingsByHost(hostId);
        return ResponseEntity.ok(
                ApiResponse.<List<ListingResponse>>builder()
                        .code(1000)
                        .message("Host listings retrieved successfully")
                        .result(response)
                        .build());
    }

    /**
     * Get paginated listings by host with optional status filter
     */
    @GetMapping("/host/{hostId}/paginated")
    public ResponseEntity<Page<ListingItemResponse>> getListingsByHostPaginated(
            @PathVariable String hostId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "DESC") String direction) {

        log.info("REST request to get paginated listings for host: {}, status: {}", hostId, status);

        Sort.Direction sortDirection = Sort.Direction.fromString(direction);
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sort));

        ListingStatus listingStatus = status != null && !status.isEmpty() ? ListingStatus.valueOf(status) : null;
        Page<ListingItemResponse> response = listingService.getListingsByHostPaginated(hostId, listingStatus, pageable);

        return ResponseEntity.ok(response);
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
    public ApiResponse<List<HomeSectionResponse>> getHomeSections(@RequestParam(required = false) Integer limit) {
        return ApiResponse.<List<HomeSectionResponse>>builder()
                .result(listingService.getHomeSections(limit))
                .build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
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

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
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

    @GetMapping("/{listingId}/detail")
    public CompositeListingResponse getListingDetail(
        @PathVariable UUID listingId,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
        @RequestParam(defaultValue = "1") Integer adults,
        @RequestParam(defaultValue = "0") Integer children,
        @RequestParam(defaultValue = "0") Integer infants,
        @RequestParam(defaultValue = "0") Integer pets ) {
        return listingDetailService.getDetail(listingId, checkIn, checkOut, adults, children, infants, pets);
    }
}