package com.chatbotservice.context;

import java.time.Instant;
import java.util.List;

public record ConversationListingContext(
        String userId,
        String conversationId,
        List<ListingSearchSnapshot> searches,
        Instant updatedAt,
        Instant expiresAt
) {
}
