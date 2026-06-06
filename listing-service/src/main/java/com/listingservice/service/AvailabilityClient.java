package com.listingservice.service;

import com.listingservice.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class AvailabilityClient {

  private final RestClient bookingServiceClient;

  public AvailabilityClient(@Value("${clients.booking-service.base-url:http://localhost:8086/bookings}") String bookingServiceBaseUrl) {
    this.bookingServiceClient = RestClient.builder()
        .baseUrl(bookingServiceBaseUrl)
        .requestFactory(requestFactory())
        .build();
  }

  public boolean isAvailable(UUID listingId, LocalDate checkIn, LocalDate checkOut) {
    if (listingId == null || checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
      return false;
    }

    try {
      ApiResponse<Boolean> response = bookingServiceClient.get()
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

  public Map<String, Boolean> getAvailability(List<UUID> listingIds, LocalDate checkIn, LocalDate checkOut) {
    if (listingIds == null || listingIds.isEmpty()) {
      return Map.of();
    }

    try {
      ApiResponse<Map<String, Boolean>> response = bookingServiceClient.post()
          .uri("/availability/batch")
          .body(new BatchAvailabilityRequest(listingIds, checkIn, checkOut))
          .retrieve()
          .body(new ParameterizedTypeReference<ApiResponse<Map<String, Boolean>>>() {});

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
      ApiResponse<Boolean> response = bookingServiceClient.get()
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

  private SimpleClientHttpRequestFactory requestFactory() {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofMillis(1000));
    factory.setReadTimeout(Duration.ofMillis(1500));
    return factory;
  }

  private record BatchAvailabilityRequest(List<UUID> listingIds, LocalDate checkIn, LocalDate checkOut) {
  }
}

