package com.listingservice.service;

import com.listingservice.dto.response.AmenityResponse;

import java.util.List;
import java.util.UUID;

public interface IListingAmenityService {
    void addAmenityToListing(UUID listingId, UUID amenityId);
    void removeAmenityFromListing(UUID listingId, UUID amenityId);
    List<AmenityResponse> getListingAmenities(UUID listingId);
    void updateListingAmenities(UUID listingId, List<UUID> amenityIds);
    void updateListingAmenityNames(UUID listingId, List<String> amenityNames);
}
