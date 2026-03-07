package com.userservice.controller;

import com.userservice.dto.ApiResponse;
import com.userservice.dto.request.RegistrationRequest;
import com.userservice.dto.response.UserProfileResponseDTO;
import com.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
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
}
