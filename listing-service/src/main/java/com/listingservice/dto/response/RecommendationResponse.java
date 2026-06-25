package com.listingservice.dto.response;

import java.util.List;

public record RecommendationResponse(
        String userId,
        List<RecommendationItemResponse> recommendations
) {
}
