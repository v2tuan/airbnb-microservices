package com.activityservice.dto;

import java.util.List;

public record RecommendationResponse(String keycloakUserId, List<RecommendationItemResponse> recommendations) {
}

