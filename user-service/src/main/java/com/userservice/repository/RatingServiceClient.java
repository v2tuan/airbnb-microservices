package com.userservice.repository;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

@FeignClient(name = "rating-service", path = "/ratings")
public interface RatingServiceClient {

  @GetMapping("/host/{hostId}")
  Map<String, Object> getReviewsByHost(
      @PathVariable String hostId,
      @RequestParam int page,
      @RequestParam int size,
      @RequestParam String sort,
      @RequestParam String direction);

  @GetMapping("/summary/host/{hostId}")
  Map<String, Object> getHostRatingSummary(@PathVariable String hostId);
}
