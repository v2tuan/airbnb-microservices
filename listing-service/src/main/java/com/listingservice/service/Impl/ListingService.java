package com.listingservice.service.Impl;

import com.listingservice.constant.ListingStatus;
import com.listingservice.dto.request.ListingCreationRequest;
import com.listingservice.dto.request.ListingUpdateRequest;
import com.listingservice.dto.response.ListingResponse;
import com.listingservice.entity.Listing;
import com.listingservice.exception.AppException;
import com.listingservice.exception.ErrorCode;
import com.listingservice.mapper.IListingMapper;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.IListingService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingService implements IListingService {
    
    ListingRepository listingRepository;
    IListingMapper listingMapper;
    
    @Override
    @Transactional
    public ListingResponse createListing(ListingCreationRequest request) {
        log.info("Creating listing with title: {}", request.getTitle());
        
        Listing listing = listingMapper.toEntity(request);
        listing.setStatus(ListingStatus.DRAFT);
        
        Listing savedListing = listingRepository.save(listing);
        log.info("Listing created with ID: {}", savedListing.getListingId());
        
        return listingMapper.toResponse(savedListing);
    }
    
    @Override
    @Transactional
    public ListingResponse updateListing(UUID listingId, ListingUpdateRequest request) {
        log.info("Updating listing ID: {}", listingId);
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        listingMapper.updateEntity(listing, request);
        
        Listing updatedListing = listingRepository.save(listing);
        log.info("Listing updated: {}", listingId);
        
        return listingMapper.toResponse(updatedListing);
    }
    
    @Override
    @Transactional
    public void deleteListing(UUID listingId) {
        log.info("Deleting listing ID: {}", listingId);
        
        if (!listingRepository.existsById(listingId)) {
            throw new AppException(ErrorCode.LISTING_NOT_FOUND);
        }
        
        listingRepository.deleteById(listingId);
        log.info("Listing deleted: {}", listingId);
    }
    
    @Override
    public ListingResponse getListingById(UUID listingId) {
        log.info("Getting listing by ID: {}", listingId);
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        return listingMapper.toResponse(listing);
    }
    
    @Override
    public List<ListingResponse> getAllListings() {
        log.info("Getting all listings");
        
        return listingRepository.findAll().stream()
                .map(listingMapper::toResponse)
                .toList();
    }
    
    @Override
    public List<ListingResponse> getListingsByHost(UUID hostId) {
        log.info("Getting listings by host ID: {}", hostId);
        
        return listingRepository.findByHostId(hostId).stream()
                .map(listingMapper::toResponse)
                .toList();
    }
    
    @Override
    public List<ListingResponse> searchListings(String city, String country, Integer maxGuests) {
        log.info("Searching listings - City: {}, Country: {}, Max Guests: {}", city, country, maxGuests);
        
        List<Listing> listings;
        
        if (city != null && country != null) {
            listings = listingRepository.findByCityAndCountry(city, country);
        } else if (city != null) {
            listings = listingRepository.findByCity(city);
        } else {
            listings = listingRepository.findByStatus(ListingStatus.ACTIVE);
        }
        
        if (maxGuests != null) {
            listings = listings.stream()
                    .filter(l -> l.getMaxGuests() >= maxGuests)
                    .toList();
        }
        
        return listings.stream()
                .map(listingMapper::toResponse)
                .toList();
    }
    
    @Override
    public List<ListingResponse> searchByPriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        log.info("Searching listings by price range: {} - {}", minPrice, maxPrice);
        
        return listingRepository.findByPriceRangeAndStatus(minPrice, maxPrice, ListingStatus.ACTIVE)
                .stream()
                .map(listingMapper::toResponse)
                .toList();
    }
    
    @Override
    public List<ListingResponse> searchByLocation(BigDecimal latitude, BigDecimal longitude, Double radius) {
        log.info("Searching listings by location - Lat: {}, Lng: {}, Radius: {}km", latitude, longitude, radius);
        
        return listingRepository.findByLocationWithinRadius(latitude, longitude, radius, ListingStatus.ACTIVE)
                .stream()
                .map(listingMapper::toResponse)
                .toList();
    }
    
    @Override
    @Transactional
    public void activateListing(UUID listingId) {
        log.info("Activating listing ID: {}", listingId);
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        listing.setStatus(ListingStatus.ACTIVE);
        listingRepository.save(listing);
        
        log.info("Listing activated: {}", listingId);
    }
    
    @Override
    @Transactional
    public void deactivateListing(UUID listingId) {
        log.info("Deactivating listing ID: {}", listingId);
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        listing.setStatus(ListingStatus.INACTIVE);
        listingRepository.save(listing);
        
        log.info("Listing deactivated: {}", listingId);
    }
}