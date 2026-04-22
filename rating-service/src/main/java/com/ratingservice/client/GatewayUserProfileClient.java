package com.ratingservice.client;

import com.ratingservice.dto.BatchPublicUserProfileRequest;
import com.ratingservice.dto.UserProfileDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Optional;

@Component
@Slf4j
public class GatewayUserProfileClient implements UserProfileClient {

  private final RestTemplate restTemplate;
  private final String gatewayBaseUrl;

  public GatewayUserProfileClient(
      RestTemplate restTemplate,
      @Value("${app.gateway-base-url:http://localhost:8888/api/v1}") String gatewayBaseUrl) {
    this.restTemplate = restTemplate;
    this.gatewayBaseUrl = gatewayBaseUrl;
  }

  @Override
  public Optional<UserProfileDTO> getByKeycloakUserId(String keycloakUserId) {
    if (keycloakUserId == null || keycloakUserId.isBlank()) {
      return Optional.empty();
    }

    try {
      URI uri = UriComponentsBuilder.fromUriString(normalizeBaseUrl())
          .path("/users/public/{keycloakUserId}")
          .buildAndExpand(keycloakUserId)
          .toUri();

      ResponseEntity<UserProfileDTO> response = restTemplate.exchange(
          uri,
          HttpMethod.GET,
          null,
          UserProfileDTO.class);

      return Optional.ofNullable(response.getBody());
    } catch (Exception ex) {
      log.warn("Failed to fetch public user profile for keycloakUserId={}", keycloakUserId, ex);
      return Optional.empty();
    }
  }

  @Override
  public Map<String, UserProfileDTO> getByKeycloakUserIds(Collection<String> keycloakUserIds) {
    if (keycloakUserIds == null || keycloakUserIds.isEmpty()) {
      return Map.of();
    }

    try {
      URI uri = UriComponentsBuilder.fromUriString(normalizeBaseUrl())
          .path("/users/public/batch")
          .build()
          .toUri();

      BatchPublicUserProfileRequest request = new BatchPublicUserProfileRequest(
          keycloakUserIds.stream()
              .filter(id -> id != null && !id.isBlank())
              .distinct()
              .toList());

      ResponseEntity<UserProfileDTO[]> response = restTemplate.postForEntity(uri, request, UserProfileDTO[].class);
      UserProfileDTO[] body = response.getBody();
      if (body == null || body.length == 0) {
        return Map.of();
      }

      Map<String, UserProfileDTO> profiles = new LinkedHashMap<>();
      for (UserProfileDTO profile : body) {
        if (profile != null && profile.keycloakUserId() != null) {
          profiles.put(profile.keycloakUserId(), profile);
        }
      }
      return profiles;
    } catch (Exception ex) {
      log.warn("Failed to fetch public user profiles for keycloakUserIds={}", new LinkedHashSet<>(keycloakUserIds), ex);
      return Map.of();
    }
  }

  private String normalizeBaseUrl() {
    return gatewayBaseUrl.endsWith("/") ? gatewayBaseUrl.substring(0, gatewayBaseUrl.length() - 1) : gatewayBaseUrl;
  }
}
