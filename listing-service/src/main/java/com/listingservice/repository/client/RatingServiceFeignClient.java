package com.listingservice.repository.client;

import com.listingservice.dto.request.BatchListingRatingSummaryRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;
import java.util.UUID;

@FeignClient(name = "rating-service", path = "/ratings")
public interface RatingServiceFeignClient {

  @GetMapping("/listing/{listingId}/average")
  Double getAverageRating(@PathVariable UUID listingId);

  @GetMapping("/listing/{listingId}/summary")
  Map<String, Object> getListingRatingSummary(@PathVariable UUID listingId);

  @PostMapping("/listings/summary")
  Map<String, Map<String, Object>> getListingRatingSummaries(
      @RequestBody BatchListingRatingSummaryRequest request);
}
