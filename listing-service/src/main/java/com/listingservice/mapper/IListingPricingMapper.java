package com.listingservice.mapper;

import com.listingservice.dto.request.ListingPricingRequest;
import com.listingservice.dto.response.ListingPricingResponse;
import com.listingservice.entity.ListingPricing;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface IListingPricingMapper {
    
    @Mapping(target = "pricingId", ignore = true)
    @Mapping(target = "listing", ignore = true)
    ListingPricing toEntity(ListingPricingRequest request);
    
    @Mapping(target = "listingId", source = "listing.listingId")
    ListingPricingResponse toResponse(ListingPricing listingPricing);
    
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "pricingId", ignore = true)
    @Mapping(target = "listing", ignore = true)
    void updateEntity(@MappingTarget ListingPricing listingPricing, ListingPricingRequest request);
}