package com.apigateway.configuration;

import com.apigateway.dto.response.HostProfileResponseDTO;
import com.apigateway.service.UserProfileAggregatorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;

import static org.springframework.web.reactive.function.server.RequestPredicates.GET;
import static org.springframework.web.reactive.function.server.RouterFunctions.route;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class UserProfileRouteConfig {

    private final UserProfileAggregatorService userProfileAggregatorService;

    @Bean
    public RouterFunction<ServerResponse> userProfileRoutes() {
        return route(GET("/internal/profile/{userId}"), this::handleUserProfile);
    }

    private reactor.core.publisher.Mono<ServerResponse> handleUserProfile(ServerRequest request) {
        String userId = request.pathVariable("userId");
        int reviewPage = parseIntQueryParam(request, "reviewPage", 0);
        int listingPage = parseIntQueryParam(request, "listingPage", 0);

        log.info("FUNCTIONAL GET /api/v1/profile/{} - reviewPage: {}, listingPage: {}", userId, reviewPage, listingPage);

        return userProfileAggregatorService.getUserProfile(userId, reviewPage, listingPage)
                .flatMap(profile -> ServerResponse.ok().bodyValue(profile))
                .onErrorResume(ex -> {
                    log.error("Error in functional profile route for userId: {}", userId, ex);
                    return ServerResponse.notFound().build();
                });
    }

    private int parseIntQueryParam(ServerRequest request, String key, int defaultValue) {
        try {
            return request.queryParam(key).map(Integer::parseInt).orElse(defaultValue);
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }
}
