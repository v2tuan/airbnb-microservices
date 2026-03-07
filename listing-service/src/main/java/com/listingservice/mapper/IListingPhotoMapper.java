package com.listingservice.mapper;

import com.listingservice.dto.request.ListingPhotoRequest;
import com.listingservice.dto.response.ListingPhotoResponse;
import com.listingservice.entity.ListingPhoto;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface IListingPhotoMapper {
    
    @Mapping(target = "photoId", ignore = true)
    @Mapping(target = "listing", ignore = true)
    @Mapping(target = "displayOrder", ignore = true)
    @Mapping(target = "isCover", ignore = true)
    @Mapping(target = "uploadedAt", ignore = true)
    ListingPhoto toEntity(ListingPhotoRequest request);
    
    @Mapping(target = "listingId", source = "listing.listingId")
    ListingPhotoResponse toResponse(ListingPhoto listingPhoto);
    
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "photoId", ignore = true)
    @Mapping(target = "listing", ignore = true)
    @Mapping(target = "displayOrder", ignore = true)
    @Mapping(target = "isCover", ignore = true)
    @Mapping(target = "uploadedAt", ignore = true)
    void updateEntity(@MappingTarget ListingPhoto listingPhoto, ListingPhotoRequest request);
}