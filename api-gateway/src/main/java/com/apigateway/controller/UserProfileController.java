package com.apigateway.controller;

import com.apigateway.client.UserServiceClient;
import com.apigateway.dto.response.HostProfileResponseDTO;
import com.apigateway.dto.response.PublicHostDTO;
import com.apigateway.service.UserProfileAggregatorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/internal/profile")
@RequiredArgsConstructor
@Slf4j
public class UserProfileController {

    private final UserProfileAggregatorService userProfileAggregatorService;
    private final UserServiceClient userServiceClient;

    /**
     * Get complete user profile with reviews and listings (if user is a host)
     * Works for both regular users and hosts
     */
    @GetMapping("/{userId}")
    public Mono<ResponseEntity<HostProfileResponseDTO>> getUserProfile(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int reviewPage,
            @RequestParam(defaultValue = "0") int listingPage) {

        log.info("GET /api/v1/profile/{} - reviewPage: {}, listingPage: {}", userId, reviewPage, listingPage);

        return userProfileAggregatorService.getUserProfile(userId, reviewPage, listingPage)
                .map(ResponseEntity::ok)
                .onErrorResume(e -> {
                    log.error("Error fetching user profile for userId: {}", userId, e);

                // Fallback: return a minimal profile if basic user info exists.
                return userServiceClient.getPublicProfile(userId)
                    .map(publicHost -> ResponseEntity.ok(buildFallbackResponse(userId, publicHost)))
                    .onErrorResume(inner -> Mono.just(ResponseEntity.notFound().build()));
                });
    }

        private HostProfileResponseDTO buildFallbackResponse(String userId, PublicHostDTO publicHost) {
        HostProfileResponseDTO.HostInfoDTO hostInfo = HostProfileResponseDTO.HostInfoDTO.builder()
            .id(userId)
            .fullName(publicHost.fullName())
            .avatarUrl(publicHost.avatarUrl())
            .isSuperhost(publicHost.superHost() != null && publicHost.superHost())
            .identityVerified(true)
            .location(null)
            .hostSince(publicHost.joinedAt())
            .responseRate("N/A")
            .responseTime("N/A")
            .build();

        HostProfileResponseDTO.HostStatsDTO stats = HostProfileResponseDTO.HostStatsDTO.builder()
            .reviewsCount(0L)
            .overallRating(0.0)
            .hostingMonths(0L)
            .activeListingsCount(0L)
            .build();

        HostProfileResponseDTO.PagedReviewsDTO reviews = HostProfileResponseDTO.PagedReviewsDTO.builder()
            .items(java.util.List.of())
            .page(0)
            .size(6)
            .totalElements(0L)
            .build();

        HostProfileResponseDTO.PagedListingsDTO listings = HostProfileResponseDTO.PagedListingsDTO.builder()
            .items(java.util.List.of())
            .page(0)
            .size(8)
            .totalElements(0L)
            .build();

        return HostProfileResponseDTO.builder()
            .hostInfo(hostInfo)
            .stats(stats)
            .reviews(reviews)
            .listings(listings)
            .build();
        }
}
