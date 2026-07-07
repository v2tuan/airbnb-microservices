package com.bookingservice.repository.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;

@FeignClient(name = "rating-service", path = "/ratings")
public interface RatingClient {
    @GetMapping("/listing/{listingId}/summary")
    Map<String, Object> getListingRatingSummary(@PathVariable String listingId);
}
