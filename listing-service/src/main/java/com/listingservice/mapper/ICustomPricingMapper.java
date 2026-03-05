package com.listingservice.mapper;

import com.listingservice.dto.request.CustomPricingRequest;
import com.listingservice.dto.response.CustomPricingResponse;
import com.listingservice.entity.CustomPricing;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ICustomPricingMapper {
    
    @Mapping(target = "customPricingId", ignore = true)
    @Mapping(target = "listing", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    CustomPricing toEntity(CustomPricingRequest request);
    
    @Mapping(target = "listingId", source = "listing.listingId")
    CustomPricingResponse toResponse(CustomPricing customPricing);
    
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "customPricingId", ignore = true)
    @Mapping(target = "listing", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    void updateEntity(@MappingTarget CustomPricing customPricing, CustomPricingRequest request);
}