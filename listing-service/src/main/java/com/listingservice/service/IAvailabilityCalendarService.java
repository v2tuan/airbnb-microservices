package com.listingservice.service;

import com.listingservice.dto.request.AvailabilityRequest;
import com.listingservice.dto.response.AvailabilityResponse;
import com.listingservice.dto.response.ListingAvailabilityCheckResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface IAvailabilityCalendarService {
    AvailabilityResponse setAvailability(UUID listingId, AvailabilityRequest request);
    List<AvailabilityResponse> getAvailability(UUID listingId, LocalDate startDate, LocalDate endDate);
    boolean checkAvailability(UUID listingId, LocalDate startDate, LocalDate endDate);
    ListingAvailabilityCheckResponse checkBookableAvailability(UUID listingId, LocalDate checkIn, LocalDate checkOut);
    void blockDates(UUID listingId, LocalDate startDate, LocalDate endDate);
    void unblockDates(UUID listingId, LocalDate startDate, LocalDate endDate);
}
