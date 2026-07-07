package com.userservice.controller;

import com.userservice.dto.ApiResponse;
import com.userservice.dto.identity.LoginRequest;
import com.userservice.dto.identity.TokenExchangeResponse;
import com.userservice.dto.request.RegistrationRequest;
import com.userservice.dto.request.UserUpdateRequestDTO;
import com.userservice.dto.response.UserProfileResponseDTO;
import com.userservice.service.PublicProfileService;
import com.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class UserController {
    private final UserService userService;
    private final PublicProfileService publicProfileService;

    @Value("${APP_COOKIE_SECURE:false}")
    private boolean refreshCookieSecure;

    @Value("${APP_COOKIE_SAME_SITE:Lax}")
    private String refreshCookieSameSite;

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
        ResponseCookie cookie = refreshTokenCookie(response.getRefreshToken(), response.getRefreshExpiresIn());

        return ResponseEntity.status(HttpStatus.OK)
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.<TokenExchangeResponse>builder()
                        .success(true)
                        .message("Login successful")
                        .data(response)
                        .build());
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenExchangeResponse>> refreshToken(@CookieValue("refresh_token") String refreshToken) {
        TokenExchangeResponse tokenExchangeResponse = userService.refreshToken(refreshToken);
        ResponseCookie cookie = refreshTokenCookie(
                tokenExchangeResponse.getRefreshToken(),
                tokenExchangeResponse.getRefreshExpiresIn()
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.<TokenExchangeResponse>builder()
                .success(true)
                .message("refresh success")
                .data(tokenExchangeResponse)
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

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponseDTO>> updateMe(
            @RequestHeader("Authorization") String authorizationHeader,
            @RequestBody UserUpdateRequestDTO request) {
        var response = userService.updateMe(authorizationHeader, request);
        return ResponseEntity.ok(ApiResponse.<UserProfileResponseDTO>builder()
                .success(true)
                .message("User profile updated")
                .data(response)
                .build());
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<ApiResponse<UserProfileResponseDTO>> updateAvatar(
            @RequestHeader("Authorization") String authorizationHeader,
            @RequestParam("file") MultipartFile file) {
        var response = userService.updateAvatar(authorizationHeader, file);
        return ResponseEntity.ok(ApiResponse.<UserProfileResponseDTO>builder()
                .success(true)
                .message("Avatar updated")
                .data(response)
                .build());
    }

    private ResponseCookie refreshTokenCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from("refresh_token", value)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .path("/")
                .maxAge(maxAgeSeconds)
                .sameSite(refreshCookieSameSite)
                .build();
    }
}
