package com.userservice.controller;

import com.userservice.dto.ApiResponse;
import com.userservice.dto.response.HostStatusResponse;
import com.userservice.service.StripeService;
import com.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/stripe")
@RequiredArgsConstructor
@Slf4j
public class StripeConnectController {
    private final StripeService stripeConnectService;
    private final UserService userService;

    /**
     * POST /api/stripe/connect/onboard
     * Frontend gọi khi user click "Become a Host"
     */
    @PostMapping("/onboard")
    public ResponseEntity<ApiResponse<OnboardResponse>> startOnboarding() {

        String onboardingUrl = stripeConnectService.createOrResumeOnboarding();

        return ResponseEntity.ok(ApiResponse.<OnboardResponse>builder()
                .success(true)
                .message("Onboard success")
                .data(new OnboardResponse(onboardingUrl))
                .build());
    }

    /**
     * GET /api/stripe/connect/status
     * Frontend gọi tại /host/success để verify
     */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<HostStatusResponse>> checkStatus() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        Jwt jwt = (Jwt) authentication.getPrincipal();

        UUID userId = UUID.fromString(jwt.getSubject());

        HostStatusResponse status = stripeConnectService.checkAndActivateHost(userId);

        return ResponseEntity.ok(ApiResponse.<HostStatusResponse>builder()
                .success(true)
                .data(status)
                .build());
    }

    /**
     * GET /api/stripe/connect/refresh
     * Frontend gọi tại /host/reauth để lấy link mới
     */
    @GetMapping("/refresh")
    public ResponseEntity<ApiResponse<OnboardResponse>> refreshLink() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        Jwt jwt = (Jwt) authentication.getPrincipal();

        UUID userId = UUID.fromString(jwt.getSubject());

        String newUrl = stripeConnectService.refreshOnboardingLink(userId);

        return ResponseEntity.ok(ApiResponse.<OnboardResponse>builder()
                .success(true)
                .message("Refresh success")
                .data(new OnboardResponse(newUrl)).build());
    }

    @GetMapping("/{hostId}")
    public ResponseEntity<ApiResponse<String>> getStripeAccountId(@PathVariable String hostId) {
        String stripeAccountId = userService.getStripeAccountId(hostId);

        return ResponseEntity.ok(ApiResponse.<String>builder()
                .success(true)
                .data(stripeAccountId)
                .build());
    }

    // --- DTOs ---
    public record OnboardResponse(String url) {}

}
