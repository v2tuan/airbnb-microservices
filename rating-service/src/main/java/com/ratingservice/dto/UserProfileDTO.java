package com.ratingservice.dto;

import java.time.Instant;
import java.util.UUID;

public record UserProfileDTO(
    UUID userId,
    String keycloakUserId,
    String fullName,
    String avatarUrl,
    Boolean superHost,
    Instant joinedAt) {
}

