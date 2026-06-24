package com.listingservice.repository.client;

import com.listingservice.dto.response.RecommendationResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "activity-service", contextId = "activityServiceRecommendationClient", path = "/recommendations")
public interface RecommendationServiceFeignClient {

    @GetMapping("/users/{userId}")
    RecommendationResponse recommendForUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "10") Integer limit
    );
}
