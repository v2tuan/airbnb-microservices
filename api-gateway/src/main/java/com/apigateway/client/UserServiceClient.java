package com.apigateway.client;

import com.apigateway.dto.response.PublicHostDTO;
import com.apigateway.exception.HostNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
@Slf4j
public class UserServiceClient {

    private final WebClient userServiceWebClient;

    public UserServiceClient(@Qualifier("userServiceWebClient") WebClient userServiceWebClient) {
        this.userServiceWebClient = userServiceWebClient;
    }

    /**
     * Get public host profile by keycloak user ID
     */
    public Mono<PublicHostDTO> getPublicProfile(String userIdOrKeycloakId) {
        if (isUuid(userIdOrKeycloakId)) {
            return getPublicProfileByUserId(userIdOrKeycloakId)
                    .onErrorResume(HostNotFoundException.class, ex -> {
                        log.debug("Not found by userId, trying keycloakUserId: {}", userIdOrKeycloakId);
                        return getPublicProfileByKeycloakId(userIdOrKeycloakId);
                    });
        }
        return getPublicProfileByKeycloakId(userIdOrKeycloakId)
                .onErrorResume(HostNotFoundException.class, ex -> {
                    log.debug("Not found by keycloakUserId, trying userId: {}", userIdOrKeycloakId);
                    return getPublicProfileByUserId(userIdOrKeycloakId);
                });
    }

    public Mono<PublicHostDTO> getPublicProfileByKeycloakId(String keycloakUserId) {
        return userServiceWebClient
                .get()
                .uri("/public/{keycloakUserId}", keycloakUserId)
                .retrieve()
                .onStatus(
                        HttpStatus.NOT_FOUND::equals,
                        response -> Mono.error(new HostNotFoundException("Profile not found by keycloakUserId: " + keycloakUserId))
                )
                .bodyToMono(PublicHostDTO.class)
                .doOnNext(host -> log.debug("Fetched public profile by keycloakUserId: {}", keycloakUserId));
    }

    public Mono<PublicHostDTO> getPublicProfileByUserId(String userId) {
        return userServiceWebClient
                .get()
                .uri("/public/by-user-id/{userId}", userId)
                .retrieve()
                .onStatus(
                        HttpStatus.NOT_FOUND::equals,
                        response -> Mono.error(new HostNotFoundException("Profile not found by userId: " + userId))
                )
                .bodyToMono(PublicHostDTO.class)
                .doOnNext(host -> log.debug("Fetched public profile by userId: {}", userId));
    }

    private boolean isUuid(String value) {
        try {
            UUID.fromString(value);
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

}
