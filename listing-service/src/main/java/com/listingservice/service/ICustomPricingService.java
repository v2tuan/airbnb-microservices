package com.listingservice.service;

import com.listingservice.dto.request.CustomPricingRequest;
import com.listingservice.dto.response.CustomPricingResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ICustomPricingService {
    CustomPricingResponse setCustomPricing(UUID listingId, CustomPricingRequest request);
    List<CustomPricingResponse> getCustomPricing(UUID listingId, LocalDate startDate, LocalDate endDate);
    void deleteCustomPricing(UUID listingId, LocalDate date);
    void deleteAllCustomPricing(UUID listingId);
}