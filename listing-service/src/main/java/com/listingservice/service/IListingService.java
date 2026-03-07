package com.listingservice.service;

import com.listingservice.dto.request.ListingCreationRequest;
import com.listingservice.dto.request.ListingUpdateRequest;
import com.listingservice.dto.response.ListingResponse;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface IListingService {
    ListingResponse createListing(ListingCreationRequest request);
    ListingResponse updateListing(UUID listingId, ListingUpdateRequest request);
    void deleteListing(UUID listingId);
    ListingResponse getListingById(UUID listingId);
    List<ListingResponse> getAllListings();
    List<ListingResponse> getListingsByHost(UUID hostId);
    List<ListingResponse> searchListings(String city, String country, Integer maxGuests);
    List<ListingResponse> searchByPriceRange(BigDecimal minPrice, BigDecimal maxPrice);
    List<ListingResponse> searchByLocation(BigDecimal latitude, BigDecimal longitude, Double radius);
    void activateListing(UUID listingId);
    void deactivateListing(UUID listingId);
}