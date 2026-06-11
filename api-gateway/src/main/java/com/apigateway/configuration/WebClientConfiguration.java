package com.apigateway.configuration;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;

@Configuration
public class WebClientConfiguration {

    @Value("${services.user-service.url:http://localhost:8082/users}")
    private String userServiceUrl;

    @Value("${services.listing-service.url:http://localhost:8081}")
    private String listingServiceUrl;

    @Value("${services.rating-service.url:http://localhost:8085}")
    private String ratingServiceUrl;

    @Bean
    public ConnectionProvider downstreamConnectionProvider() {
        return ConnectionProvider.builder("gateway-downstream")
                .maxConnections(200)
                .pendingAcquireMaxCount(500)
                .pendingAcquireTimeout(Duration.ofSeconds(2))
                .build();
    }

    @Bean
    public HttpClient downstreamHttpClient(ConnectionProvider downstreamConnectionProvider) {
        return HttpClient.create(downstreamConnectionProvider)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 1000)
                .responseTimeout(Duration.ofSeconds(3))
                .doOnConnected(connection -> connection
                        .addHandlerLast(new ReadTimeoutHandler(3))
                        .addHandlerLast(new WriteTimeoutHandler(3)));
    }

    @Bean("userServiceWebClient")
    public WebClient userServiceWebClient(HttpClient downstreamHttpClient) {
        return downstreamWebClientBuilder(downstreamHttpClient)
                .baseUrl(userServiceUrl)
                .build();
    }

    @Bean("listingServiceWebClient")
    public WebClient listingServiceWebClient(HttpClient downstreamHttpClient) {
        return downstreamWebClientBuilder(downstreamHttpClient)
                .baseUrl(listingServiceUrl)
                .build();
    }

    @Bean("ratingServiceWebClient")
    public WebClient ratingServiceWebClient(HttpClient downstreamHttpClient) {
        return downstreamWebClientBuilder(downstreamHttpClient)
                .baseUrl(ratingServiceUrl)
                .build();
    }

    private WebClient.Builder downstreamWebClientBuilder(HttpClient downstreamHttpClient) {
        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(downstreamHttpClient));
    }
}
