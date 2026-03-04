package com.userservice.dto.response;

import com.userservice.dto.request.AddressRequestDTO;

import java.util.List;
import java.util.UUID;

public record UserProfileResponseDTO(
    UUID userId,
    String fullName,
    String avatarUrl,
    List<AddressRequestDTO> addresses,
    boolean isHost
) {
}
