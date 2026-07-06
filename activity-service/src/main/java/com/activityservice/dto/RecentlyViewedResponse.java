package com.activityservice.dto;

import java.util.List;

public record RecentlyViewedResponse(
    String keycloakUserId,
    List<RecentlyViewedItemResponse> recentlyViewed
) {
}
