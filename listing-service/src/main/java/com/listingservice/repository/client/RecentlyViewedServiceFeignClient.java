package com.listingservice.repository.client;

import com.listingservice.dto.response.RecentlyViewedResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "activity-service", contextId = "activityServiceRecentlyViewedClient", path = "/activities")
public interface RecentlyViewedServiceFeignClient {

    @GetMapping("/users/{userId}/recently-viewed")
    RecentlyViewedResponse getRecentlyViewed(
            @PathVariable String userId,
            @RequestParam(defaultValue = "10") Integer limit
    );
}
