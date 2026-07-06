package com.ratingservice.client;

import com.ratingservice.dto.ApiResponse;
import com.ratingservice.dto.BookingReviewContextDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "booking-service", path = "/bookings")
public interface BookingReviewClient {
  @GetMapping("/{bookingId}/review-context")
  ApiResponse<BookingReviewContextDTO> getReviewContext(
      @RequestHeader("authorization") String authorization,
      @PathVariable String bookingId);
}
