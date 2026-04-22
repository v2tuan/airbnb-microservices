package com.userservice.controller;

import com.userservice.dto.request.BatchPublicHostProfileRequest;
import com.userservice.dto.response.PublicHostResponseDTO;
import com.userservice.service.PublicProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/public")
public class PublicUserController {

  private final PublicProfileService publicUserProfileService;

  public PublicUserController(PublicProfileService publicUserProfileService) {
    this.publicUserProfileService = publicUserProfileService;
  }

  @GetMapping("/{keycloakUserId}")
  public ResponseEntity<PublicHostResponseDTO> getOne(@PathVariable String keycloakUserId) {
    return publicUserProfileService.getByKeycloakUserId(keycloakUserId)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PostMapping("/batch")
  public ResponseEntity<List<PublicHostResponseDTO>> getBatch(
      @Valid @RequestBody BatchPublicHostProfileRequest request ) {
    return ResponseEntity.ok(publicUserProfileService.getByKeycloakUserIds(request.keycloakUserIds()));
  }

  @GetMapping("/by-user-id/{userId}")
  public ResponseEntity<PublicHostResponseDTO> getOneByUserId(@PathVariable UUID userId) {
    return publicUserProfileService.getByUserId(userId)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }
}
