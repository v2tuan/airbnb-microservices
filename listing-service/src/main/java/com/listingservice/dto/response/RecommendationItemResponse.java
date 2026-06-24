package com.listingservice.dto.response;

public record RecommendationItemResponse(
        String listingId,
        double score,
        String source
) {
}
