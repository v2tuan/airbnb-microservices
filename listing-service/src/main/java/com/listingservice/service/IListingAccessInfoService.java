package com.listingservice.service;

import com.listingservice.dto.request.ListingAccessInfoRequest;
import com.listingservice.dto.response.ListingAccessInfoResponse;

import java.util.UUID;

public interface IListingAccessInfoService {
    ListingAccessInfoResponse createOrUpdateAccessInfo(UUID listingId, ListingAccessInfoRequest request);
    ListingAccessInfoResponse getAccessInfoByListing(UUID listingId);
    void deleteAccessInfo(UUID listingId);
}
