package com.activityservice.dto;

import java.util.List;

public record RecentlyViewedResponse(
    String userId,
    List<RecentlyViewedItemResponse> recentlyViewed
) {
}
