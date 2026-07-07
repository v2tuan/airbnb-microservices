package com.userservice.dto.response;

import com.userservice.entity.StripeAccountStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record AdminUserResponseDTO(
    UUID userId,
    String keycloakUserId,
    String fullName,
    String firstName,
    String lastName,
    String avatarUrl,
    String gender,
    boolean host,
    Boolean superhost,
    Boolean enabled,
    List<String> roles,
    String hostVerificationStatus,
    StripeAccountStatus stripeAccountStatus,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
