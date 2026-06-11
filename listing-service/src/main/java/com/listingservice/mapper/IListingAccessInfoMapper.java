package com.listingservice.mapper;

import com.listingservice.dto.response.ListingAccessInfoResponse;
import com.listingservice.entity.ListingAccessInfo;
import com.listingservice.entity.ListingGuideStep;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface IListingAccessInfoMapper {

    @Mapping(target = "listingId", source = "listing.listingId")
    ListingAccessInfoResponse toResponse(ListingAccessInfo accessInfo);

    ListingAccessInfoResponse.GuideStepResponse toGuideStepResponse(ListingGuideStep guideStep);
}
