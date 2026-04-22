package com.apigateway.dto.response;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO mapping từ user-service PublicHostResponseDTO
 */
public record PublicHostDTO(
    UUID userId,
    String keycloakUserId,
    String fullName,
    String avatarUrl,
    Boolean superHost,
    Instant joinedAt) {
}

