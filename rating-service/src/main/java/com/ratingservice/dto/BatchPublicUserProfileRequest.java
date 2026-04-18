package com.ratingservice.dto;

import java.util.List;

public record BatchPublicUserProfileRequest(List<String> keycloakUserIds) {
}

