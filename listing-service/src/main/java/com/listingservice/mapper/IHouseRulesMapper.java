package com.listingservice.mapper;

import com.listingservice.dto.request.HouseRulesRequest;
import com.listingservice.dto.response.HouseRulesResponse;
import com.listingservice.entity.HouseRules;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface IHouseRulesMapper {
    
    @Mapping(target = "ruleId", ignore = true)
    @Mapping(target = "listing", ignore = true)
    HouseRules toEntity(HouseRulesRequest request);
    
    @Mapping(target = "listingId", source = "listing.listingId")
    HouseRulesResponse toResponse(HouseRules houseRules);
    
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "ruleId", ignore = true)
    @Mapping(target = "listing", ignore = true)
    void updateEntity(@MappingTarget HouseRules houseRules, HouseRulesRequest request);
}