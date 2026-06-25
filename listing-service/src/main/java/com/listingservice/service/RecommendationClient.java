package com.listingservice.service;

import com.listingservice.dto.response.RecommendationResponse;
import com.listingservice.repository.client.RecommendationServiceFeignClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class RecommendationClient {

    private static final int DEFAULT_LIMIT = 10;

    private final RecommendationServiceFeignClient recommendationServiceFeignClient;

    public List<UUID> getRecommendedListingIds(String userId, Integer limit) {
        if (userId == null || userId.isBlank()) {
            return List.of();
        }

        int safeLimit = normalizeLimit(limit);

        try {
            RecommendationResponse response = recommendationServiceFeignClient.recommendForUser(userId, safeLimit);
            if (response == null || response.recommendations() == null || response.recommendations().isEmpty()) {
                return List.of();
            }

            return response.recommendations().stream()
                    .map(item -> item == null ? null : item.listingId())
                    .filter(id -> id != null && !id.isBlank())
                    .map(this::safeParseUuid)
                    .filter(java.util.Objects::nonNull)
                    .toList();
        } catch (Exception ex) {
            log.warn("Failed to fetch recommendations for userId={}", userId, ex);
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
