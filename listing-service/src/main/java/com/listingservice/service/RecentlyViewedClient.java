package com.listingservice.service;

import com.listingservice.dto.response.RecentlyViewedResponse;
import com.listingservice.repository.client.RecentlyViewedServiceFeignClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class RecentlyViewedClient {

    private static final int DEFAULT_LIMIT = 10;
    private static final String ANONYMOUS_USER_ID = "__anonymous__";

    private final RecentlyViewedServiceFeignClient recentlyViewedServiceFeignClient;

    public List<UUID> getRecentlyViewedListingIds(String userId, Integer limit) {
        int safeLimit = normalizeLimit(limit);
        String effectiveUserId = (userId == null || userId.isBlank()) ? ANONYMOUS_USER_ID : userId;

        try {
            RecentlyViewedResponse response = recentlyViewedServiceFeignClient.getRecentlyViewed(effectiveUserId, safeLimit);
            if (response == null || response.recentlyViewed() == null || response.recentlyViewed().isEmpty()) {
                return List.of();
            }

            return response.recentlyViewed().stream()
                    .map(item -> item == null ? null : item.listingId())
                    .filter(id -> id != null && !id.isBlank())
                    .map(this::safeParseUuid)
                    .filter(java.util.Objects::nonNull)
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to fetch recently viewed listings for userId={}", userId, ex);
            return List.of();
        }
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null || limit < 1) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, 100);
    }

    private UUID safeParseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
