package com.ratingservice.client;

import com.ratingservice.dto.UserProfileDTO;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;

public interface UserProfileClient {
  Optional<UserProfileDTO> getByKeycloakUserId(String keycloakUserId);

  Map<String, UserProfileDTO> getByKeycloakUserIds(Collection<String> keycloakUserIds);
}

