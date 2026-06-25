package com.listingservice.repository.client;

import com.listingservice.dto.request.ActivityIngestionRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "activity-service", contextId = "activityServiceIngestionClient", path = "/activities")
public interface ActivityServiceFeignClient {

    @PostMapping
    Map<String, Object> createActivity(@RequestBody ActivityIngestionRequest request);
}
