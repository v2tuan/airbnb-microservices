package com.chatbotservice.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "chatbot")
public record ChatbotProperties(
        Duration responseTimeout,
        Listing listing
) {
    public ChatbotProperties {
        responseTimeout = responseTimeout != null ? responseTimeout : Duration.ofSeconds(60);
        listing = listing != null ? listing : new Listing(null, null);
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
}
