package com.userservice.dto.response;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record UserProfileResponseDTO(
    UUID userId,
    String fullName,
    String firstName,
    String lastName,
    LocalDate dateOfBirth,
    String avatarUrl,
    List<AddressResponseDTO> addresses,
    boolean isHost
) {
}
