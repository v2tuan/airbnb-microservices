package com.identityservice.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RegisterRequest {
    @Email
    String email;

    @Size(min = 6, message = "INVALID_PASSWORD")
    String password;

    String phoneNumber;
}
