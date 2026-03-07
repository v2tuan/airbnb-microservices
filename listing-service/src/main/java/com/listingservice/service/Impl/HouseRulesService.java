package com.listingservice.service.Impl;

import com.listingservice.dto.request.HouseRulesRequest;
import com.listingservice.dto.response.HouseRulesResponse;
import com.listingservice.entity.HouseRules;
import com.listingservice.entity.Listing;
import com.listingservice.exception.AppException;
import com.listingservice.exception.ErrorCode;
import com.listingservice.mapper.IHouseRulesMapper;
import com.listingservice.repository.HouseRulesRepository;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.IHouseRulesService;
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
public class HouseRulesService implements IHouseRulesService {
    
    HouseRulesRepository houseRulesRepository;
    ListingRepository listingRepository;
    IHouseRulesMapper houseRulesMapper;
    
    @Override
    @Transactional
    public HouseRulesResponse createOrUpdateHouseRules(UUID listingId, HouseRulesRequest request) {
        log.info("Creating/Updating house rules for listing: {}", listingId);
        
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));
        
        HouseRules houseRules = houseRulesRepository.findByListingListingId(listingId)
                .orElse(HouseRules.builder()
                        .listing(listing)
                        .build());
        
        houseRulesMapper.updateEntity(houseRules, request);
        
        HouseRules savedRules = houseRulesRepository.save(houseRules);
        log.info("House rules created/updated for listing: {}", listingId);
        
        return houseRulesMapper.toResponse(savedRules);
    }
    
    @Override
    public HouseRulesResponse getHouseRulesByListing(UUID listingId) {
        log.info("Getting house rules for listing: {}", listingId);
        
        HouseRules houseRules = houseRulesRepository.findByListingListingId(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.HOUSE_RULES_NOT_FOUND));
        
        return houseRulesMapper.toResponse(houseRules);
    }
    
    @Override
    @Transactional
    public void deleteHouseRules(UUID listingId) {
        log.info("Deleting house rules for listing: {}", listingId);
        
        if (!houseRulesRepository.existsByListingListingId(listingId)) {
            throw new AppException(ErrorCode.HOUSE_RULES_NOT_FOUND);
        }
        
        houseRulesRepository.deleteByListingListingId(listingId);
        log.info("House rules deleted for listing: {}", listingId);
    }
}