package com.listingservice.dto.response;

import java.time.Instant;

public record RecentlyViewedItemResponse(
        String listingId,
        Instant viewedAt
) {
}
