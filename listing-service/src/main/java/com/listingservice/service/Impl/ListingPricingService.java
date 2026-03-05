package com.listingservice.service.Impl;

import com.listingservice.dto.request.ListingPricingRequest;
import com.listingservice.dto.response.ListingPricingResponse;
import com.listingservice.entity.Listing;
import com.listingservice.entity.ListingPricing;
import com.listingservice.exception.AppException;
import com.listingservice.exception.ErrorCode;
import com.listingservice.mapper.IListingPricingMapper;
import com.listingservice.repository.ListingPricingRepository;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.IListingPricingService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingPricingService implements IListingPricingService {
    
    ListingPricingRepository listingPricingRepository;
    ListingRepository listingRepository;
    IListingPricingMapper listingPricingMapper;
    
    @Override
    @Transactional
    public ListingPricingResponse createOrUpdatePricing(UUID listingId, ListingPricingRequest request) {
        log.info("Creating/Updating pricing for listing: {}", listingId);
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        ListingPricing pricing = listingPricingRepository.findByListingListingId(listingId)
                .orElse(ListingPricing.builder()
                        .listing(listing)
                        .build());
        
        listingPricingMapper.updateEntity(pricing, request);
        
        ListingPricing savedPricing = listingPricingRepository.save(pricing);
        log.info("Pricing created/updated for listing: {}", listingId);
        
        return listingPricingMapper.toResponse(savedPricing);
    }
    
    @Override
    public ListingPricingResponse getPricingByListing(UUID listingId) {
        log.info("Getting pricing for listing: {}", listingId);
        
        ListingPricing pricing = listingPricingRepository.findByListingListingId(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.PRICING_NOT_FOUND));
        
        return listingPricingMapper.toResponse(pricing);
    }
    
    @Override
    @Transactional
    public void deletePricing(UUID listingId) {
        log.info("Deleting pricing for listing: {}", listingId);
        
        if (!listingPricingRepository.existsByListingListingId(listingId)) {
            throw new AppException(ErrorCode.PRICING_NOT_FOUND);
        }
        
        listingPricingRepository.deleteByListingListingId(listingId);
        log.info("Pricing deleted for listing: {}", listingId);
    }
}