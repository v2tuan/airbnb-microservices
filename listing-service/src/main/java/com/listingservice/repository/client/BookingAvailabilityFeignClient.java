package com.listingservice.repository.client;

import com.listingservice.dto.request.BatchAvailabilityRequest;
import com.listingservice.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "booking-service", path = "/bookings")
public interface BookingAvailabilityFeignClient {

  @GetMapping("/availability")
  ApiResponse<Boolean> isAvailable(
      @RequestParam UUID listingId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut);

  @PostMapping("/availability/batch")
  ApiResponse<Map<String, Boolean>> getAvailabilityBatch(@RequestBody BatchAvailabilityRequest request);

  @GetMapping("/availability/active-bookings")
  ApiResponse<Boolean> hasActiveBookings(@RequestParam UUID listingId);
}
