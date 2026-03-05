package com.listingservice.service;

import com.listingservice.dto.request.HouseRulesRequest;
import com.listingservice.dto.response.HouseRulesResponse;

import java.util.UUID;

public interface IHouseRulesService {
    HouseRulesResponse createOrUpdateHouseRules(UUID listingId, HouseRulesRequest request);
    HouseRulesResponse getHouseRulesByListing(UUID listingId);
    void deleteHouseRules(UUID listingId);
}