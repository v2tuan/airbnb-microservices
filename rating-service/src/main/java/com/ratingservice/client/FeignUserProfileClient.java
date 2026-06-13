package com.ratingservice.client;

import com.ratingservice.dto.BatchPublicUserProfileRequest;
import com.ratingservice.dto.UserProfileDTO;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class FeignUserProfileClient implements UserProfileClient {

  private final UserServiceFeignClient userServiceFeignClient;

  @Override
  public Optional<UserProfileDTO> getByKeycloakUserId(String keycloakUserId) {
    if (keycloakUserId == null || keycloakUserId.isBlank()) {
      return Optional.empty();
    }

    try {
      return Optional.ofNullable(userServiceFeignClient.getByKeycloakUserId(keycloakUserId));
    } catch (FeignException.NotFound ex) {
      return Optional.empty();
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

    List<String> ids = keycloakUserIds.stream()
        .filter(id -> id != null && !id.isBlank())
        .distinct()
        .toList();

    if (ids.isEmpty()) {
      return Map.of();
    }

    try {
      List<UserProfileDTO> profiles = userServiceFeignClient.getBatch(new BatchPublicUserProfileRequest(ids));
      if (profiles == null || profiles.isEmpty()) {
        return Map.of();
      }

      Map<String, UserProfileDTO> result = new LinkedHashMap<>();
      for (UserProfileDTO profile : profiles) {
        if (profile != null && profile.keycloakUserId() != null) {
          result.put(profile.keycloakUserId(), profile);
        }
      }
      return result;
    } catch (Exception ex) {
      log.warn("Failed to fetch public user profiles for keycloakUserIds={}", new LinkedHashSet<>(keycloakUserIds), ex);
      return Map.of();
    }
  }
}
