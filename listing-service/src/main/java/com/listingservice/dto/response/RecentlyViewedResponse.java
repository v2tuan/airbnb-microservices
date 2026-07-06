package com.listingservice.dto.response;

import java.util.List;

public record RecentlyViewedResponse(
        String keycloakUserId,
        List<RecentlyViewedItemResponse> recentlyViewed
) {
}
