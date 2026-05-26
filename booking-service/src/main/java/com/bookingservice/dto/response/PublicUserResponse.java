package com.bookingservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicUserResponse {
    private UUID userId;
    private String keycloakUserId;
    private String fullName;
    private String avatarUrl;
    private Boolean superHost;
    private Instant joinedAt;
}
