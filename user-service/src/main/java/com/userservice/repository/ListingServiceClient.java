package com.userservice.repository;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

@FeignClient(name = "listing-service", path = "/listings")
public interface ListingServiceClient {

  @GetMapping("/host/{hostId}/paginated")
  Map<String, Object> getListingsByHostPaginated(
      @PathVariable String hostId,
      @RequestParam int page,
      @RequestParam int size,
      @RequestParam String status,
      @RequestParam String sort,
      @RequestParam String direction);
}
