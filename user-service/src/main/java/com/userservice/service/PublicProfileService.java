package com.userservice.service;

import com.userservice.dto.response.PublicHostResponseDTO;
import com.userservice.entity.User;
import com.userservice.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Service
public class PublicProfileService {
  private final UserRepository userRepository;

  public PublicProfileService (UserRepository userRepository)
  {
    this.userRepository = userRepository;
  }

  public Optional<PublicHostResponseDTO> getByKeycloakUserId(String keycloakUserId) {
    return userRepository.findByKeycloakUserId(keycloakUserId).map(this::toPublicResponse);
  }

  public List<PublicHostResponseDTO> getByKeycloakUserIds(List<String> keycloadUserIds) {
    return userRepository.findByKeycloakUserIdIn(keycloadUserIds).stream().map(this::toPublicResponse).toList();
  }

  private PublicHostResponseDTO toPublicResponse(User u) {
    return new PublicHostResponseDTO(
        u.getUserId(),
        u.getKeycloakUserId(),
        u.getFullName(),
        u.getAvatarUrl(),
        u.getHostProfile() != null ? u.getHostProfile().getIsSuperhost() : false,
        u.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant()
    );
  }
}
