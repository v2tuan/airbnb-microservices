package com.listingservice.service;

import com.listingservice.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.UUID;

@Component
@Slf4j
public class AvailabilityClient {

  @Value("${clients.booking-service.base-url:http://localhost:8086/bookings}")
  private String bookingServiceBaseUrl;

  public boolean isAvailable(UUID listingId, LocalDate checkIn, LocalDate checkOut) {
    if (listingId == null || checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
      return false;
    }

    try {
      ApiResponse<Boolean> response = RestClient.builder()
          .baseUrl(bookingServiceBaseUrl)
          .build()
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/availability")
              .queryParam("listingId", listingId)
              .queryParam("checkIn", checkIn)
              .queryParam("checkOut", checkOut)
              .build())
          .retrieve()
          .body(new ParameterizedTypeReference<ApiResponse<Boolean>>() {});

      return response != null && Boolean.TRUE.equals(response.getData());
    } catch (Exception ex) {
      log.warn("Failed to check booking availability for listingId={}. Falling back to date validation only.", listingId, ex);
      return true;
    }
  }

  public boolean hasActiveBookings(UUID listingId) {
    if (listingId == null) {
      return false;
    }

    try {
      ApiResponse<Boolean> response = RestClient.builder()
          .baseUrl(bookingServiceBaseUrl)
          .build()
          .get()
          .uri(uriBuilder -> uriBuilder
              .path("/availability/active-bookings")
              .queryParam("listingId", listingId)
              .build())
          .retrieve()
          .body(new ParameterizedTypeReference<ApiResponse<Boolean>>() {});

      return response != null && Boolean.TRUE.equals(response.getData());
    } catch (Exception ex) {
      log.warn("Failed to check active bookings for listingId={}. Blocking deactivation for safety.", listingId, ex);
      return true;
    }
  }
}

