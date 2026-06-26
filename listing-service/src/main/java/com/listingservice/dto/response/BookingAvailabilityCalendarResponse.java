package com.listingservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingAvailabilityCalendarResponse {
    private UUID listingId;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private List<LocalDate> unavailableDates;
}
