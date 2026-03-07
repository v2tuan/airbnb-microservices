package com.listingservice.service;

import com.listingservice.dto.request.AmenityRequest;
import com.listingservice.dto.response.AmenityResponse;

import java.util.List;
import java.util.UUID;

public interface IAmenityService {
    AmenityResponse createAmenity(AmenityRequest request);
    AmenityResponse updateAmenity(UUID amenityId, AmenityRequest request);
    void deleteAmenity(UUID amenityId);
    AmenityResponse getAmenityById(UUID amenityId);
    List<AmenityResponse> getAllAmenities();
    List<AmenityResponse> getAmenitiesByCategory(String category);
}