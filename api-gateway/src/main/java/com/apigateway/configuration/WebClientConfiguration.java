package com.apigateway.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfiguration {

    @Value("${services.user-service.url:http://localhost:8082/users}")
    private String userServiceUrl;

    @Value("${services.listing-service.url:http://localhost:8081}")
    private String listingServiceUrl;

    @Value("${services.rating-service.url:http://localhost:8085}")
    private String ratingServiceUrl;

    @Bean("userServiceWebClient")
    public WebClient userServiceWebClient() {
        return WebClient.builder()
                .baseUrl(userServiceUrl)
                .build();
    }

    @Bean("listingServiceWebClient")
    public WebClient listingServiceWebClient() {
        return WebClient.builder()
                .baseUrl(listingServiceUrl)
                .build();
    }

    @Bean("ratingServiceWebClient")
    public WebClient ratingServiceWebClient() {
        return WebClient.builder()
                .baseUrl(ratingServiceUrl)
                .build();
    }
}

