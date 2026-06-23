package com.chatbotservice.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "chatbot")
public record ChatbotProperties(
        Duration responseTimeout,
        Listing listing,
        Memory memory
) {
    public ChatbotProperties {
        responseTimeout = responseTimeout != null ? responseTimeout : Duration.ofSeconds(60);
        listing = listing != null ? listing : new Listing(null, null);
        memory = memory != null ? memory : new Memory(null);
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
}
