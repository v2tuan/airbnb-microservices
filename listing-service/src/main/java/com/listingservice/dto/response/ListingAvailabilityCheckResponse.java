package com.listingservice.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ListingAvailabilityCheckResponse {
    UUID listingId;
    LocalDate checkIn;
    LocalDate checkOut;
    Long nights;
    Boolean available;
    List<LocalDate> availableDates;
    List<LocalDate> unavailableDates;
    List<DailyAvailabilityResponse> dailyAvailability;
    List<String> reasons;
    String message;
}
