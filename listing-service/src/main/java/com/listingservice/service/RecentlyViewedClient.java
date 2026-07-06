package com.listingservice.service;

import com.listingservice.dto.response.RecentlyViewedResponse;
import com.listingservice.dto.response.PublicHostResponseDTO;
import com.listingservice.repository.client.RecentlyViewedServiceFeignClient;
import com.listingservice.repository.client.UserServiceFeignClient;
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
    private final UserServiceFeignClient userServiceFeignClient;

    public List<UUID> getRecentlyViewedListingIds(String keycloakUserId, Integer limit) {
        int safeLimit = normalizeLimit(limit);
        String effectiveKeycloakUserId = (keycloakUserId == null || keycloakUserId.isBlank())
                ? ANONYMOUS_USER_ID
                : keycloakUserId;

        try {
            List<UUID> keycloakUserResults = fetchRecentlyViewed(effectiveKeycloakUserId, safeLimit);
            if (!keycloakUserResults.isEmpty() || ANONYMOUS_USER_ID.equals(effectiveKeycloakUserId)) {
                return keycloakUserResults;
            }

            String legacyUserId = resolveLegacyUserId(effectiveKeycloakUserId);
            if (legacyUserId == null || legacyUserId.isBlank() || legacyUserId.equals(effectiveKeycloakUserId)) {
                return keycloakUserResults;
            }

            List<UUID> legacyResults = fetchRecentlyViewed(legacyUserId, safeLimit);
            if (!legacyResults.isEmpty()) {
                log.info("Recently viewed fallback used legacy userId={} for keycloakUserId={}", legacyUserId, effectiveKeycloakUserId);
            }
            return legacyResults;
        } catch (Exception ex) {
            log.warn("Failed to fetch recently viewed listings for keycloakUserId={}", keycloakUserId, ex);
            return List.of();
        }
    }

    private List<UUID> fetchRecentlyViewed(String userId, int limit) {
        RecentlyViewedResponse response = recentlyViewedServiceFeignClient.getRecentlyViewed(userId, limit);
        if (response == null || response.recentlyViewed() == null || response.recentlyViewed().isEmpty()) {
            return List.of();
        }

        return response.recentlyViewed().stream()
                .map(item -> item == null ? null : item.listingId())
                .filter(id -> id != null && !id.isBlank())
                .map(this::safeParseUuid)
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private String resolveLegacyUserId(String keycloakUserId) {
        try {
            PublicHostResponseDTO profile = userServiceFeignClient.getPublicUser(keycloakUserId);
            if (profile == null || profile.userId() == null) {
                return null;
            }
            return profile.userId().toString();
        } catch (Exception ex) {
            log.debug("Unable to resolve legacy userId for keycloakUserId={}", keycloakUserId, ex);
            return null;
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
