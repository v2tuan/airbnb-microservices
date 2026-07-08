package com.userservice.repository;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "listing-service", path = "/listings")
public interface ListingServiceClient {

  @PostMapping("/batch")
  Map<String, Object> getListingsByIds(@RequestBody Map<String, List<UUID>> request);

  @GetMapping("/host/{hostId}")
  Map<String, Object> getListingsByHost(@PathVariable String hostId);

  @GetMapping("/host/{hostId}/paginated")
  Map<String, Object> getListingsByHostPaginated(
      @PathVariable String hostId,
      @RequestParam int page,
      @RequestParam int size,
      @RequestParam String status,
      @RequestParam String sort,
      @RequestParam String direction);
}
