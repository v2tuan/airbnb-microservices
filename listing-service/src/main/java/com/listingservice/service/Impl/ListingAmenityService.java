package com.listingservice.service.Impl;

import com.listingservice.constant.AmenityCategory;
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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    @Override
    @Transactional
    public void updateListingAmenityNames(UUID listingId, List<String> amenityNames) {
        log.info("Updating amenity names for listing: {}", listingId);

        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));

        if (amenityNames == null || amenityNames.isEmpty()) {
            listingAmenityRepository.deleteByListingListingId(listingId);
            return;
        }

        List<Amenity> desiredAmenities = amenityNames.stream()
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(name -> !name.isBlank())
                .collect(LinkedHashMap<String, String>::new,
                        (names, name) -> names.putIfAbsent(name.toLowerCase(), name),
                        Map::putAll)
                .values()
                .stream()
                .map(this::findOrCreateAmenity)
                .toList();

        Set<UUID> desiredAmenityIds = desiredAmenities.stream()
                .map(Amenity::getAmenityId)
                .collect(java.util.stream.Collectors.toSet());

        List<ListingAmenity> existingAmenities = listingAmenityRepository.findByListingListingId(listingId);
        existingAmenities.stream()
                .filter(link -> !desiredAmenityIds.contains(link.getAmenity().getAmenityId()))
                .forEach(link -> listingAmenityRepository.deleteByListingListingIdAndAmenityAmenityId(
                        listingId,
                        link.getAmenity().getAmenityId()));

        Set<UUID> existingAmenityIds = existingAmenities.stream()
                .map(link -> link.getAmenity().getAmenityId())
                .collect(java.util.stream.Collectors.toSet());

        desiredAmenities.stream()
                .filter(amenity -> !existingAmenityIds.contains(amenity.getAmenityId()))
                .map(amenity -> ListingAmenity.builder()
                        .listing(listing)
                        .amenity(amenity)
                        .build())
                .forEach(listingAmenityRepository::save);

        log.info("Listing amenity names updated");
    }

    private Amenity findOrCreateAmenity(String name) {
        return amenityRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> amenityRepository.save(Amenity.builder()
                        .name(name)
                        .category(resolveCategory(name))
                        .build()));
    }

    private AmenityCategory resolveCategory(String name) {
        String normalizedName = name.toLowerCase();

        if (normalizedName.contains("alarm")
                || normalizedName.contains("extinguisher")
                || normalizedName.contains("aid")
                || normalizedName.contains("sơ cứu")
                || normalizedName.contains("báo khói")
                || normalizedName.contains("chữa cháy")) {
            return AmenityCategory.SAFETY;
        }

        if (normalizedName.contains("tv")
                || normalizedName.contains("piano")
                || normalizedName.contains("pool table")
                || normalizedName.contains("lake")
                || normalizedName.contains("beach")
                || normalizedName.contains("ski")) {
            return AmenityCategory.ENTERTAINMENT;
        }

        if (normalizedName.contains("pool")
                || normalizedName.contains("hot tub")
                || normalizedName.contains("patio")
                || normalizedName.contains("bbq")
                || normalizedName.contains("fire pit")
                || normalizedName.contains("gym")
                || normalizedName.contains("exercise")
                || normalizedName.contains("shower")) {
            return AmenityCategory.FACILITIES;
        }

        return AmenityCategory.BASIC;
    }
}
