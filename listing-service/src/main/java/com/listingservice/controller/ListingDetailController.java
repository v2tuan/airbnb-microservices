package com.listingservice.controller;

import com.listingservice.constant.ListingStatus;
import com.listingservice.dto.request.ListingBatchRequest;
import com.listingservice.dto.request.ListingCreationRequest;
import com.listingservice.dto.request.ListingSuspensionRequest;
import com.listingservice.dto.request.ListingUnsuspensionRequest;
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
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/listings")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingDetailController {

    private static final int DEFAULT_HOST_LISTINGS_PAGE_SIZE = 12;
    private static final int MAX_HOST_LISTINGS_PAGE_SIZE = 50;
    private static final Set<String> HOST_LISTINGS_SORT_FIELDS = Set.of(
            "createdAt",
            "title",
            "city",
            "status"
    );

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
                        .data(response)
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
                        .data(response)
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
                        .data(response)
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
                .data(listingService.getListingsByIds(request.listingIds()))
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
                        .data(response)
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
                        .data(response)
                        .build());
    }

    /**
     * Get paginated listings by host with optional status filter
     */
    @GetMapping("/host/{hostId}/paginated")
    public ResponseEntity<Page<ListingItemResponse>> getListingsByHostPaginated(
            @PathVariable String hostId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "DESC") String direction) {

        log.info("REST request to get paginated listings for host: {}, status: {}, keyword: {}", hostId, status, keyword);

        Sort.Direction sortDirection = parseSortDirection(direction);
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                normalizeHostListingsPageSize(size),
                Sort.by(sortDirection, normalizeHostListingsSort(sort))
        );

        ListingStatus listingStatus = status != null && !status.isEmpty() ? ListingStatus.valueOf(status.trim()) : null;
        Page<ListingItemResponse> response = listingService.getListingsByHostPaginated(hostId, listingStatus, keyword, pageable);

        return ResponseEntity.ok(response);
    }

    private int normalizeHostListingsPageSize(int size) {
        if (size < 1) {
            return DEFAULT_HOST_LISTINGS_PAGE_SIZE;
        }

        return Math.min(size, MAX_HOST_LISTINGS_PAGE_SIZE);
    }

    private String normalizeHostListingsSort(String sort) {
        return HOST_LISTINGS_SORT_FIELDS.contains(sort) ? sort : "createdAt";
    }

    private Sort.Direction parseSortDirection(String direction) {
        try {
            return Sort.Direction.fromString(direction);
        } catch (IllegalArgumentException ex) {
            return Sort.Direction.DESC;
        }
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ListingResponse>>> searchListings(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Integer maxGuests,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) BigDecimal latitude,
            @RequestParam(required = false) BigDecimal longitude,
            @RequestParam(required = false) Double radius,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {
        log.info("REST request to search listings - City: {}, Country: {}, Max Guests: {}, Min Price: {}, Max Price: {}, Latitude: {}, Longitude: {}, Radius: {}, CheckIn: {}, CheckOut: {}",
                city, country, maxGuests, minPrice, maxPrice, latitude, longitude, radius, checkIn, checkOut);
        List<ListingResponse> response = listingService.searchListings(
                city,
                country,
                maxGuests,
                minPrice,
                maxPrice,
                latitude,
                longitude,
                radius,
                checkIn,
                checkOut);
        return ResponseEntity.ok(
                ApiResponse.<List<ListingResponse>>builder()
                        .code(1000)
                        .message("Search results retrieved successfully")
                        .data(response)
                        .build());
    }

    @GetMapping("/sections")
    public ApiResponse<List<HomeSectionResponse>> getHomeSections(@RequestParam(required = false) Integer limit) {
        return ApiResponse.<List<HomeSectionResponse>>builder()
                .data(listingService.getHomeSections(limit))
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

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PatchMapping("/{listingId}/suspend")
    public ResponseEntity<ApiResponse<Void>> suspendListing(
            @PathVariable UUID listingId,
            @Valid @RequestBody ListingSuspensionRequest request
    ) {
        log.info("REST request to suspend listing ID: {}", listingId);
        listingService.suspendListing(listingId, request);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Listing suspended successfully")
                        .build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HOST', 'ROLE_ADMIN')")
    @PatchMapping("/{listingId}/unsuspend")
    public ResponseEntity<ApiResponse<Void>> unsuspendListing(
            @PathVariable UUID listingId,
            @Valid @RequestBody ListingUnsuspensionRequest request
    ) {
        log.info("REST request to unsuspend listing ID: {}", listingId);
        listingService.unsuspendListing(listingId, request);
        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .code(1000)
                        .message("Listing unsuspended successfully")
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
