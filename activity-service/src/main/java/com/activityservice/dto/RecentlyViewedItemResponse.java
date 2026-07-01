package com.activityservice.dto;

import java.time.Instant;

public record RecentlyViewedItemResponse(
    String listingId,
    Instant viewedAt
) {
}
