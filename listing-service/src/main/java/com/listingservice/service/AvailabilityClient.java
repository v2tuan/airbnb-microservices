package com.listingservice.service;

import com.listingservice.dto.request.BatchAvailabilityRequest;
import com.listingservice.dto.response.ApiResponse;
import com.listingservice.repository.client.BookingAvailabilityFeignClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class AvailabilityClient {

  private final BookingAvailabilityFeignClient bookingAvailabilityFeignClient;

  public boolean isAvailable(UUID listingId, LocalDate checkIn, LocalDate checkOut) {
    if (listingId == null || checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
      return false;
    }

    try {
      ApiResponse<Boolean> response = bookingAvailabilityFeignClient.isAvailable(listingId, checkIn, checkOut);
      return response != null && Boolean.TRUE.equals(response.getData());
    } catch (Exception ex) {
      log.warn("Failed to check booking availability for listingId={}. Falling back to date validation only.", listingId, ex);
      return true;
    }
  }

  public Map<String, Boolean> getAvailability(List<UUID> listingIds, LocalDate checkIn, LocalDate checkOut) {
    if (listingIds == null || listingIds.isEmpty()) {
      return Map.of();
    }

    try {
      ApiResponse<Map<String, Boolean>> response = bookingAvailabilityFeignClient.getAvailabilityBatch(
          new BatchAvailabilityRequest(listingIds, checkIn, checkOut));
      return response != null && response.getData() != null ? response.getData() : Map.of();
    } catch (Exception ex) {
      log.warn("Failed to batch check booking availability. Falling back to available.", ex);
      return Map.of();
    }
  }

  public boolean hasActiveBookings(UUID listingId) {
    if (listingId == null) {
      return false;
    }

    try {
      ApiResponse<Boolean> response = bookingAvailabilityFeignClient.hasActiveBookings(listingId);
      return response != null && Boolean.TRUE.equals(response.getData());
    } catch (Exception ex) {
      log.warn("Failed to check active bookings for listingId={}. Blocking deactivation for safety.", listingId, ex);
      return true;
    }
  }
}
