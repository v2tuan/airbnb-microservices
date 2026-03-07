package com.listingservice.service;

import com.listingservice.dto.request.ListingPricingRequest;
import com.listingservice.dto.response.ListingPricingResponse;

import java.util.UUID;

public interface IListingPricingService {
    ListingPricingResponse createOrUpdatePricing(UUID listingId, ListingPricingRequest request);
    ListingPricingResponse getPricingByListing(UUID listingId);
    void deletePricing(UUID listingId);
}