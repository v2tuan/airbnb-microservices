package com.bookingservice.dto.request;

import java.util.List;

public record BatchPublicUserProfileRequest(List<String> keycloakUserIds) {
}
