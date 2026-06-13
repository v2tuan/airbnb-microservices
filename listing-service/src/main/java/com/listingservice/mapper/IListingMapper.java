package com.listingservice.mapper;

import com.listingservice.dto.request.ListingCreationRequest;
import com.listingservice.dto.request.ListingUpdateRequest;
import com.listingservice.dto.response.ListingResponse;
import com.listingservice.entity.Listing;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, uses = {
    IListingPhotoMapper.class, 
    IAmenityMapper.class, 
    IListingPricingMapper.class, 
    IHouseRulesMapper.class,
    IListingAccessInfoMapper.class
})
public interface IListingMapper {
    
    @Mapping(target = "listingId", ignore = true)
    @Mapping(target = "hostId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "photos", ignore = true)
    @Mapping(target = "listingAmenities", ignore = true)
    @Mapping(target = "pricing", ignore = true)
    @Mapping(target = "houseRules", ignore = true)
    @Mapping(target = "accessInfo", ignore = true)
    @Mapping(target = "customPricing", ignore = true)
    @Mapping(target = "availabilityCalendar", ignore = true)
    @Mapping(target = "cancellationPolicyCode", source = "cancellationPolicyCode", defaultValue = "FLEXIBLE")
    Listing toEntity(ListingCreationRequest request);
    
    @Mapping(target = "amenities", source = "listingAmenities", qualifiedByName = "toAmenityResponseList")
    @Mapping(target = "photos", source = "photos")
    @Mapping(target = "pricing", source = "pricing")
    @Mapping(target = "houseRules", source = "houseRules")
    @Mapping(target = "accessInfo", source = "accessInfo")
    ListingResponse toResponse(Listing listing);
    
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "listingId", ignore = true)
    @Mapping(target = "hostId", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "photos", ignore = true)
    @Mapping(target = "listingAmenities", ignore = true)
    @Mapping(target = "pricing", ignore = true)
    @Mapping(target = "houseRules", ignore = true)
    @Mapping(target = "accessInfo", ignore = true)
    @Mapping(target = "customPricing", ignore = true)
    @Mapping(target = "availabilityCalendar", ignore = true)
    void updateEntity(@MappingTarget Listing listing, ListingUpdateRequest request);
    
    @Named("toAmenityResponseList")
    default java.util.List<com.listingservice.dto.response.AmenityResponse> mapAmenities(
            java.util.Set<com.listingservice.entity.ListingAmenity> listingAmenities) {
        if (listingAmenities == null) {
            return null;
        }
        return listingAmenities.stream()
                .map(la -> com.listingservice.dto.response.AmenityResponse.builder()
                        .amenityId(la.getAmenity().getAmenityId())
                        .name(la.getAmenity().getName())
                        .category(la.getAmenity().getCategory())
                        .iconUrl(la.getAmenity().getIconUrl())
                        .createdAt(la.getAmenity().getCreatedAt())
                        .build())
                .toList();
    }
}
