package com.userservice.controller;

import com.userservice.dto.ApiResponse;
import com.userservice.dto.identity.LoginRequest;
import com.userservice.dto.identity.TokenExchangeResponse;
import com.userservice.dto.request.RegistrationRequest;
import com.userservice.dto.response.UserProfileResponseDTO;
import com.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class UserController {
    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserProfileResponseDTO>> register(@RequestBody RegistrationRequest request) {
        var response = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<UserProfileResponseDTO>builder()
                    .success(true)
                    .message("Create successful")
                    .data(response)
                    .build());
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenExchangeResponse>> login(@RequestBody LoginRequest request) {
        var response = userService.login(request);
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.<TokenExchangeResponse>builder()
                        .success(true)
                        .message("Login successful")
                        .data(response)
                        .build());
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponseDTO>> getMe(
            @RequestHeader("Authorization") String authorizationHeader) {
        var response = userService.getMe(authorizationHeader);
        return ResponseEntity.ok(ApiResponse.<UserProfileResponseDTO>builder()
                .success(true)
                .message("User profile fetched")
                .data(response)
                .build());
    }
}
