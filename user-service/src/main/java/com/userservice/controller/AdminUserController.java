package com.userservice.controller;

import com.userservice.dto.ApiResponse;
import com.userservice.dto.response.AdminUserResponseDTO;
import com.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/users")
public class AdminUserController {
  private final UserService userService;

  @GetMapping
  public ResponseEntity<ApiResponse<List<AdminUserResponseDTO>>> getAdminUsers(
      @AuthenticationPrincipal Jwt jwt
  ) {
    if (!hasRealmRole(jwt, "ADMIN")) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
    }

    return ResponseEntity.ok(ApiResponse.<List<AdminUserResponseDTO>>builder()
        .success(true)
        .message("Admin users retrieved")
        .data(userService.getAdminUsers())
        .build());
  }

  private boolean hasRealmRole(Jwt jwt, String role) {
    if (jwt == null) {
      return false;
    }

    Object realmAccess = jwt.getClaims().get("realm_access");
    if (!(realmAccess instanceof Map<?, ?> access)) {
      return false;
    }

    Object roles = access.get("roles");
    return roles instanceof List<?> roleList && roleList.contains(role);
  }
}
