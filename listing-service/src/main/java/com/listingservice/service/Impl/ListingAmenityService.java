package com.listingservice.service.Impl;

import com.listingservice.dto.response.AmenityResponse;
import com.listingservice.entity.Amenity;
import com.listingservice.entity.Listing;
import com.listingservice.entity.ListingAmenity;
import com.listingservice.exception.AppException;
import com.listingservice.exception.ErrorCode;
import com.listingservice.mapper.IAmenityMapper;
import com.listingservice.repository.AmenityRepository;
import com.listingservice.repository.ListingAmenityRepository;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.IListingAmenityService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingAmenityService implements IListingAmenityService {
    
    ListingAmenityRepository listingAmenityRepository;
    ListingRepository listingRepository;
    AmenityRepository amenityRepository;
    IAmenityMapper amenityMapper;
    
    @Override
    @Transactional
    public void addAmenityToListing(UUID listingId, UUID amenityId) {
        log.info("Adding amenity {} to listing {}", amenityId, listingId);
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        Amenity amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new AppException(ErrorCode.AMENITY_NOT_FOUND));
        
        if (listingAmenityRepository.existsByListingListingIdAndAmenityAmenityId(listingId, amenityId)) {
            throw new AppException(ErrorCode.AMENITY_ALREADY_ADDED);
        }
        
        ListingAmenity listingAmenity = ListingAmenity.builder()
                .listing(listing)
                .amenity(amenity)
                .build();
        
        listingAmenityRepository.save(listingAmenity);
        log.info("Amenity added to listing");
    }
    
    @Override
    @Transactional
    public void removeAmenityFromListing(UUID listingId, UUID amenityId) {
        log.info("Removing amenity {} from listing {}", amenityId, listingId);
        
        if (!listingAmenityRepository.existsByListingListingIdAndAmenityAmenityId(listingId, amenityId)) {
            throw new AppException(ErrorCode.AMENITY_NOT_FOUND_IN_LISTING);
        }
        
        listingAmenityRepository.deleteByListingListingIdAndAmenityAmenityId(listingId, amenityId);
        log.info("Amenity removed from listing");
    }
    
    @Override
    public List<AmenityResponse> getListingAmenities(UUID listingId) {
        log.info("Getting amenities for listing: {}", listingId);
        
        return listingAmenityRepository.findByListingListingId(listingId).stream()
                .map(la -> amenityMapper.toResponse(la.getAmenity()))
                .toList();
    }
    
    @Override
    @Transactional
    public void updateListingAmenities(UUID listingId, List<UUID> amenityIds) {
        log.info("Updating amenities for listing: {}", listingId);
        
        if (!listingRepository.existsById(listingId)) {
            throw new AppException(ErrorCode.LISTING_NOT_FOUND);
        }
        
        // Remove all existing amenities
        listingAmenityRepository.deleteByListingListingId(listingId);
        
        // Add new amenities
        amenityIds.forEach(amenityId -> addAmenityToListing(listingId, amenityId));
        
        log.info("Listing amenities updated");
    }
}