package com.listingservice.dto.request;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record BatchAvailabilityRequest(
    List<UUID> listingIds,
    LocalDate checkIn,
    LocalDate checkOut) {
}
