package com.listingservice.service;

import com.listingservice.constant.ActivityEventType;
import com.listingservice.dto.request.ActivityIngestionRequest;
import com.listingservice.repository.client.ActivityServiceFeignClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class ActivityClient {

    private final ActivityServiceFeignClient activityServiceFeignClient;

    public void recordActivity(String keycloakUserId, UUID listingId, ActivityEventType eventType) {
        if (keycloakUserId == null || keycloakUserId.isBlank() || listingId == null || eventType == null) {
            return;
        }

        try {
            activityServiceFeignClient.createActivity(
                    new ActivityIngestionRequest(keycloakUserId, listingId.toString(), eventType));
        } catch (Exception ex) {
            log.warn(
                    "Failed to record activity for keycloakUserId={}, listingId={}, eventType={}",
                    keycloakUserId,
                    listingId,
                    eventType,
                    ex
            );
        }
    }
}
