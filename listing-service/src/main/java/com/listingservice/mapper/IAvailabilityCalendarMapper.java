package com.listingservice.mapper;

import com.listingservice.dto.request.AvailabilityRequest;
import com.listingservice.dto.response.AvailabilityResponse;
import com.listingservice.entity.AvailabilityCalendar;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface IAvailabilityCalendarMapper {
    
    @Mapping(target = "availabilityId", ignore = true)
    @Mapping(target = "listing", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    AvailabilityCalendar toEntity(AvailabilityRequest request);
    
    @Mapping(target = "listingId", source = "listing.listingId")
    AvailabilityResponse toResponse(AvailabilityCalendar availabilityCalendar);
    
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "availabilityId", ignore = true)
    @Mapping(target = "listing", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(@MappingTarget AvailabilityCalendar availabilityCalendar, AvailabilityRequest request);
}