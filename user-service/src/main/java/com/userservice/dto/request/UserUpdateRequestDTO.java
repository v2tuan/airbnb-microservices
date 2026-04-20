package com.userservice.dto.request;

import java.time.LocalDate;

public record UserUpdateRequestDTO(
    String firstName,
    String lastName,
    LocalDate dateOfBirth,
    String gender,
    String bio
) {
}
