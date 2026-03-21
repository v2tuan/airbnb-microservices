package com.listingservice.service;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.UUID;

@Component
public class AvailabilityClient {

  public boolean isAvailable(UUID listingId, LocalDate checkIn, LocalDate checkOut) {
    return checkIn != null && checkOut != null && checkOut.isAfter(checkIn);
  }
}

