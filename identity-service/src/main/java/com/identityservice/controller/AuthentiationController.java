package com.identityservice.controller;

import com.identityservice.dto.request.LoginRequest;
import com.identityservice.dto.request.RegisterRequest;
import com.identityservice.dto.response.ApiResponse;
import com.identityservice.dto.response.AuthenticationResponse;
import com.identityservice.service.IAccountService;
import com.identityservice.service.IAuthenticationService;
import lombok.AccessLevel;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Data
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RestController
@RequestMapping("/auth")
public class AuthentiationController {
    IAuthenticationService authenticationService;
    IAccountService accountService;

    @PostMapping("/register")
    ApiResponse<Void> register(@RequestBody RegisterRequest registerRequest) {
        accountService.register(registerRequest);
        return ApiResponse.<Void>builder()
                .message("Register successful!").build();
    }

    @PostMapping("/login")
    ApiResponse<AuthenticationResponse> login(@RequestBody LoginRequest loginRequest) {
        var result = authenticationService.login(loginRequest);
        System.out.println(result);
        return ApiResponse.<AuthenticationResponse>builder()
                .message("Login successful!")
                .data(result)
                .build();
    }
}
