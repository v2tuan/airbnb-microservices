package com.listingservice.mapper;

import com.listingservice.dto.request.AmenityRequest;
import com.listingservice.dto.response.AmenityResponse;
import com.listingservice.entity.Amenity;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface IAmenityMapper {
    
    @Mapping(target = "amenityId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "listingAmenities", ignore = true)
    Amenity toEntity(AmenityRequest request);
    
    AmenityResponse toResponse(Amenity amenity);
    
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "amenityId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "listingAmenities", ignore = true)
    void updateEntity(@MappingTarget Amenity amenity, AmenityRequest request);
}