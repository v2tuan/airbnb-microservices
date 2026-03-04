package com.userservice.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.List;

//dto = data tranfers object( đóng gói dữ liệu giữa client và server)
//dung cho update va create
public record UserRequestDTO (
    @NotBlank String lastName,
    @NotBlank String firstName,
    LocalDate dateOfBirth,
    String gender,
    String bio,
    List<String> languages
) {}
