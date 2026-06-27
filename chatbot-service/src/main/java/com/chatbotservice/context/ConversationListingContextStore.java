package com.chatbotservice.context;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationListingContextStore {

    void saveSearch(String userId, String conversationId, ListingSearchSnapshot snapshot);

    ListingResolveResult resolveListing(
            String userId,
            String conversationId,
            String listingTitle
    );

    Optional<ListingSnapshot> findListingById(String userId, String conversationId, UUID listingId);

    void clear(String userId, String conversationId);
}
