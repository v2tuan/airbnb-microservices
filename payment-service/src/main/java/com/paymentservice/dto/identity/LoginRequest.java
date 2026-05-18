package com.paymentservice.dto.identity;

import lombok.Data;

@Data
public class LoginRequest {
    private String username;
    private String password;
}
