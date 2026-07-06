package com.listingservice.dto.response;

import java.util.List;

public record RecommendationResponse(
        String keycloakUserId,
        List<RecommendationItemResponse> recommendations
) {
}
