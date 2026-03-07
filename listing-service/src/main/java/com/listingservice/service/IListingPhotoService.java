package com.listingservice.service;

import com.listingservice.dto.request.ListingPhotoRequest;
import com.listingservice.dto.response.ListingPhotoResponse;

import java.util.List;
import java.util.UUID;

public interface IListingPhotoService {
    ListingPhotoResponse addPhoto(UUID listingId, ListingPhotoRequest request);
    ListingPhotoResponse updatePhoto(UUID photoId, ListingPhotoRequest request);
    void deletePhoto(UUID photoId);
    ListingPhotoResponse getPhotoById(UUID photoId);
    List<ListingPhotoResponse> getPhotosByListing(UUID listingId);
    void setCoverPhoto(UUID listingId, UUID photoId);
    void reorderPhotos(UUID listingId, List<UUID> photoIds);
}