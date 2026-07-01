package com.listingservice.dto.response;

import java.util.List;

public record RecentlyViewedResponse(
        String userId,
        List<RecentlyViewedItemResponse> recentlyViewed
) {
}
