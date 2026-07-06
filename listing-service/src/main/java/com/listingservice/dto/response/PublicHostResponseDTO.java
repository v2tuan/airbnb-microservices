package com.listingservice.dto.response;

import java.time.Instant;
import java.util.UUID;

public record PublicHostResponseDTO(
    UUID userId,
    String keycloakUserId,
    String fullName,
    String avatarUrl,
    Boolean superHost,
    Instant joinedAt
) {
}
