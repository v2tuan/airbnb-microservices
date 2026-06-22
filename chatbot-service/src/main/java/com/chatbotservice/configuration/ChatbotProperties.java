package com.chatbotservice.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "chatbot")
public record ChatbotProperties(
        Duration responseTimeout,
        Listing listing,
        Memory memory,
        Conversation conversation
) {
    public ChatbotProperties {
        responseTimeout = responseTimeout != null ? responseTimeout : Duration.ofSeconds(60);
        listing = listing != null ? listing : new Listing(null, null);
        memory = memory != null ? memory : new Memory(null);
        conversation = conversation != null ? conversation : new Conversation(null);
    }

    public record Listing(
            Duration timeout,
            Integer maxResults
    ) {
        public Listing {
            timeout = timeout != null ? timeout : Duration.ofSeconds(3);
            maxResults = maxResults != null && maxResults > 0 ? Math.min(maxResults, 20) : 6;
        }
    }

    public record Memory(
            Integer maxMessages
    ) {
        public Memory {
            // Keep only the most recent turns in the prompt so long conversations do not
            // grow unbounded and exceed the model context window.
            maxMessages = maxMessages != null && maxMessages > 0 ? Math.min(maxMessages, 50) : 20;
        }
    }

    public record Conversation(
            Duration contextTtl
    ) {
        public Conversation {
            // This TTL is for the domain-specific listing context kept beside Spring AI
            // memory. It prevents stale "previous search" filters from living forever.
            contextTtl = contextTtl != null ? contextTtl : Duration.ofHours(2);
        }
    }
}
