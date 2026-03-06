package com.userservice.dto.request;

import java.time.LocalDateTime;
import java.util.List;

public record UserUpdateRequestDTO(
    String firstName,
    String lastName,
    LocalDateTime dateOfBirth,
    String gender,
    String bio,
    List<String> languages
) {
}
