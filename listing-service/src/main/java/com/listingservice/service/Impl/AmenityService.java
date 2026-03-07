package com.listingservice.service.Impl;

import com.listingservice.constant.AmenityCategory;
import com.listingservice.dto.request.AmenityRequest;
import com.listingservice.dto.response.AmenityResponse;
import com.listingservice.entity.Amenity;
import com.listingservice.exception.AppException;
import com.listingservice.exception.ErrorCode;
import com.listingservice.mapper.IAmenityMapper;
import com.listingservice.repository.AmenityRepository;
import com.listingservice.service.IAmenityService;
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
public class AmenityService implements IAmenityService {
    
    AmenityRepository amenityRepository;
    IAmenityMapper amenityMapper;
    
    @Override
    @Transactional
    public AmenityResponse createAmenity(AmenityRequest request) {
        log.info("Creating amenity: {}", request.getName());
        
        if (amenityRepository.existsByName(request.getName())) {
            throw new AppException(ErrorCode.AMENITY_EXISTED);
        }
        
        Amenity amenity = amenityMapper.toEntity(request);
        Amenity savedAmenity = amenityRepository.save(amenity);
        
        log.info("Amenity created with ID: {}", savedAmenity.getAmenityId());
        return amenityMapper.toResponse(savedAmenity);
    }
    
    @Override
    @Transactional
    public AmenityResponse updateAmenity(UUID amenityId, AmenityRequest request) {
        log.info("Updating amenity ID: {}", amenityId);
        
        Amenity amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new AppException(ErrorCode.AMENITY_NOT_FOUND));
        
        amenityMapper.updateEntity(amenity, request);
        Amenity updatedAmenity = amenityRepository.save(amenity);
        
        log.info("Amenity updated: {}", amenityId);
        return amenityMapper.toResponse(updatedAmenity);
    }
    
    @Override
    @Transactional
    public void deleteAmenity(UUID amenityId) {
        log.info("Deleting amenity ID: {}", amenityId);
        
        if (!amenityRepository.existsById(amenityId)) {
            throw new AppException(ErrorCode.AMENITY_NOT_FOUND);
        }
        
        amenityRepository.deleteById(amenityId);
        log.info("Amenity deleted: {}", amenityId);
    }
    
    @Override
    public AmenityResponse getAmenityById(UUID amenityId) {
        log.info("Getting amenity by ID: {}", amenityId);
        
        Amenity amenity = amenityRepository.findById(amenityId)
                .orElseThrow(() -> new AppException(ErrorCode.AMENITY_NOT_FOUND));
        
        return amenityMapper.toResponse(amenity);
    }
    
    @Override
    public List<AmenityResponse> getAllAmenities() {
        log.info("Getting all amenities");
        
        return amenityRepository.findAll().stream()
                .map(amenityMapper::toResponse)
                .toList();
    }
    
    @Override
    public List<AmenityResponse> getAmenitiesByCategory(String category) {
        log.info("Getting amenities by category: {}", category);
        
        AmenityCategory amenityCategory = AmenityCategory.valueOf(category.toUpperCase());
        
        return amenityRepository.findByCategory(amenityCategory).stream()
                .map(amenityMapper::toResponse)
                .toList();
    }
}