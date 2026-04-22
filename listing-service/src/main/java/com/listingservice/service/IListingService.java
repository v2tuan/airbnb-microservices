package com.listingservice.service;

import com.listingservice.constant.ListingStatus;
import com.listingservice.dto.request.ListingCreationRequest;
import com.listingservice.dto.request.ListingUpdateRequest;
import com.listingservice.dto.response.HomeSectionResponse;
import com.listingservice.dto.response.ListingItemResponse;
import com.listingservice.dto.response.ListingResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface IListingService {
    ListingResponse createListing(ListingCreationRequest request, String keycloakUserId);
    ListingResponse updateListing(UUID listingId, ListingUpdateRequest request);
    void deleteListing(UUID listingId);
    ListingResponse getListingById(UUID listingId);
    List<ListingResponse> getAllListings();
    List<ListingResponse> getListingsByHost(String hostId);
    List<ListingResponse> searchListings(String city, String country, Integer maxGuests);
    List<ListingResponse> searchByPriceRange(BigDecimal minPrice, BigDecimal maxPrice);
    List<ListingResponse> searchByLocation(BigDecimal latitude, BigDecimal longitude, Double radius);
    void activateListing(UUID listingId);
    void deactivateListing(UUID listingId);
    List<HomeSectionResponse> getHomeSections(Integer limitPerSection);

    /**
     * Get paginated listings by host with optional status filter
     */
    Page<ListingItemResponse> getListingsByHostPaginated(String hostId, ListingStatus status, Pageable pageable);
}

