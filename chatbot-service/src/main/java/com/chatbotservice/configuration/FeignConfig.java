package com.chatbotservice.configuration;

import feign.Request;
import org.springframework.context.annotation.Bean;

import java.util.concurrent.TimeUnit;

public class FeignConfig {

    @Bean
    public Request.Options feignRequestOptions(ChatbotProperties properties) {
        long timeoutMillis = properties.listing().timeout().toMillis();
        int connectTimeoutMillis = (int) Math.min(timeoutMillis, 1000);
        int readTimeoutMillis = (int) Math.min(timeoutMillis, Integer.MAX_VALUE);

        return new Request.Options(
                connectTimeoutMillis,
                TimeUnit.MILLISECONDS,
                readTimeoutMillis,
                TimeUnit.MILLISECONDS,
                true
        );
    }
}
