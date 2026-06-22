package com.chatbotservice.conversation;

import com.chatbotservice.configuration.ChatbotProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class ConversationListingContextStore {
    private final ConcurrentMap<String, ConversationListingContext> contexts = new ConcurrentHashMap<>();
    private final Duration ttl;

    public ConversationListingContextStore(ChatbotProperties properties) {
        this.ttl = properties.conversation().contextTtl();
    }

    public Optional<ConversationListingContext> find(String conversationKey) {
        if (conversationKey == null || conversationKey.isBlank()) {
            return Optional.empty();
        }

        ConversationListingContext context = contexts.get(conversationKey);
        if (context == null) {
            return Optional.empty();
        }

        if (isExpired(context)) {
            contexts.remove(conversationKey);
            return Optional.empty();
        }

        return Optional.of(context);
    }

    public void save(String conversationKey, ConversationListingContext context) {
        if (conversationKey == null || conversationKey.isBlank() || context == null) {
            return;
        }

        contexts.put(conversationKey, context);
    }

    public String promptBlock(String conversationKey) {
        return find(conversationKey)
                .map(ConversationListingContext::toPromptBlock)
                .orElse("");
    }

    private boolean isExpired(ConversationListingContext context) {
        // This context is only a lightweight domain cache, not the canonical chat
        // history. Expiring it avoids applying an old "previous search" to a new
        // user intent hours later.
        return context.updatedAt().plus(ttl).isBefore(Instant.now());
    }
}
