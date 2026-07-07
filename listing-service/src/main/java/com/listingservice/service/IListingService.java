package com.listingservice.service;

import com.listingservice.constant.ListingStatus;
import com.listingservice.constant.ActivityEventType;
import com.listingservice.dto.request.ListingCreationRequest;
import com.listingservice.dto.request.ListingFilterRequest;
import com.listingservice.dto.request.ListingSuspensionRequest;
import com.listingservice.dto.request.ListingUnsuspensionRequest;
import com.listingservice.dto.request.ListingUpdateRequest;
import com.listingservice.dto.response.HomeSectionResponse;
import com.listingservice.dto.response.ListingItemResponse;
import com.listingservice.dto.response.ListingResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface IListingService {
    ListingResponse createListing(ListingCreationRequest request, String keycloakUserId);
    ListingResponse updateListing(UUID listingId, ListingUpdateRequest request);
    void deleteListing(UUID listingId);
    ListingResponse getListingById(UUID listingId);
    List<ListingResponse> getListingsByIds(List<UUID> listingIds);
    List<ListingResponse> getAllListings();
    Page<ListingResponse> getAdminListings(ListingStatus status, String keyword, Pageable pageable);
    List<ListingResponse> getListingsByHost(String hostId);
        List<ListingResponse> searchListings(
            String city,
            String country,
            Integer maxGuests,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal latitude,
            BigDecimal longitude,
            Double radius,
            LocalDate checkIn,
            LocalDate checkOut);
    List<ListingResponse> searchListingsWithFilters(ListingFilterRequest request);
    void activateListing(UUID listingId);
    void deactivateListing(UUID listingId);
    void suspendListing(UUID listingId, ListingSuspensionRequest request);
    void unsuspendListing(UUID listingId, ListingUnsuspensionRequest request);
    default List<HomeSectionResponse> getHomeSections(Integer limitPerSection) {
        return getHomeSections(limitPerSection, null);
    }

    List<HomeSectionResponse> getHomeSections(Integer limitPerSection, String keycloakUserId);

    void recordListingActivity(UUID listingId, String keycloakUserId, ActivityEventType eventType);

    /**
     * Get paginated listings by host with optional status filter
     */
    Page<ListingItemResponse> getListingsByHostPaginated(String hostId, ListingStatus status, String keyword, Pageable pageable);
}

