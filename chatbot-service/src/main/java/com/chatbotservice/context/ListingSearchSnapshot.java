package com.chatbotservice.context;

import java.time.Instant;
import java.util.List;

public record ListingSearchSnapshot(
        String searchId,
        SearchCriteriaSnapshot criteria,
        List<ListingSnapshot> listings,
        Instant createdAt
) {
}
