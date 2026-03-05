package com.listingservice.service;

import com.listingservice.dto.request.AvailabilityRequest;
import com.listingservice.dto.response.AvailabilityResponse;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface IAvailabilityCalendarService {
    AvailabilityResponse setAvailability(UUID listingId, AvailabilityRequest request);
    List<AvailabilityResponse> getAvailability(UUID listingId, LocalDate startDate, LocalDate endDate);
    boolean checkAvailability(UUID listingId, LocalDate startDate, LocalDate endDate);
    void blockDates(UUID listingId, LocalDate startDate, LocalDate endDate);
    void unblockDates(UUID listingId, LocalDate startDate, LocalDate endDate);
}