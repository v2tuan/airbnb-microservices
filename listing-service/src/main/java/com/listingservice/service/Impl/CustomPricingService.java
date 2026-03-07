package com.listingservice.service.Impl;

import com.listingservice.dto.request.CustomPricingRequest;
import com.listingservice.dto.response.CustomPricingResponse;
import com.listingservice.entity.CustomPricing;
import com.listingservice.entity.Listing;
import com.listingservice.exception.AppException;
import com.listingservice.exception.ErrorCode;
import com.listingservice.mapper.ICustomPricingMapper;
import com.listingservice.repository.CustomPricingRepository;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.ICustomPricingService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class CustomPricingService implements ICustomPricingService {
    
    CustomPricingRepository customPricingRepository;
    ListingRepository listingRepository;
    ICustomPricingMapper customPricingMapper;
    
    @Override
    @Transactional
    public CustomPricingResponse setCustomPricing(UUID listingId, CustomPricingRequest request) {
        log.info("Setting custom pricing for listing: {} on date: {}", listingId, request.getDate());
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        CustomPricing customPricing = customPricingRepository
                .findByListingListingIdAndDate(listingId, request.getDate())
                .orElse(CustomPricing.builder()
                        .listing(listing)
                        .date(request.getDate())
                        .build());
        
        customPricing.setPrice(request.getPrice());
        
        CustomPricing savedPricing = customPricingRepository.save(customPricing);
        log.info("Custom pricing set for listing: {} on date: {}", listingId, request.getDate());
        
        return customPricingMapper.toResponse(savedPricing);
    }
    
    @Override
    public List<CustomPricingResponse> getCustomPricing(UUID listingId, LocalDate startDate, LocalDate endDate) {
        log.info("Getting custom pricing for listing: {} between {} and {}", listingId, startDate, endDate);
        
        if (!listingRepository.existsById(listingId)) {
            throw new AppException(ErrorCode.LISTING_NOT_FOUND);
        }
        
        return customPricingRepository.findByListingListingIdAndDateBetween(listingId, startDate, endDate)
                .stream()
                .map(customPricingMapper::toResponse)
                .toList();
    }
    
    @Override
    @Transactional
    public void deleteCustomPricing(UUID listingId, LocalDate date) {
        log.info("Deleting custom pricing for listing: {} on date: {}", listingId, date);
        
        if (!customPricingRepository.existsByListingListingIdAndDate(listingId, date)) {
            throw new AppException(ErrorCode.CUSTOM_PRICING_NOT_FOUND);
        }
        
        customPricingRepository.deleteByListingListingIdAndDate(listingId, date);
        log.info("Custom pricing deleted");
    }
    
    @Override
    @Transactional
    public void deleteAllCustomPricing(UUID listingId) {
        log.info("Deleting all custom pricing for listing: {}", listingId);
        
        if (!listingRepository.existsById(listingId)) {
            throw new AppException(ErrorCode.LISTING_NOT_FOUND);
        }
        
        customPricingRepository.deleteByListingListingId(listingId);
        log.info("All custom pricing deleted for listing: {}", listingId);
    }
}