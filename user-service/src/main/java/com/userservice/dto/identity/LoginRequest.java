package com.userservice.dto.identity;

import lombok.Data;

@Data
public class LoginRequest {
    private String username;
    private String password;
}
