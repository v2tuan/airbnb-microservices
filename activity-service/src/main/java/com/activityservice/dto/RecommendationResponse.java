package com.activityservice.dto;

import java.util.List;

public record RecommendationResponse(String userId, List<RecommendationItemResponse> recommendations) {
}

