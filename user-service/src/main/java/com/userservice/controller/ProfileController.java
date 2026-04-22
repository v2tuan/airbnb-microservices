package com.userservice.controller;

import com.userservice.dto.response.PublicHostResponseDTO;
import com.userservice.service.PublicProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final PublicProfileService publicProfileService;

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getProfile(@PathVariable String id) {
        return publicProfileService.getByAnyId(id)
                .map(this::toProfilePayload)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private Map<String, Object> toProfilePayload(PublicHostResponseDTO host) {
        Map<String, Object> hostPayload = Map.of(
                "id", host.userId().toString(),
                "fullName", host.fullName(),
                "avatarUrl", host.avatarUrl() == null ? "" : host.avatarUrl(),
                "isSuperhost", host.superHost() != null && host.superHost(),
                "identityVerified", true,
                "location", "",
                "hostSince", host.joinedAt() == null ? "" : host.joinedAt().toString(),
                "responseRate", "N/A",
                "responseTime", "N/A"
        );

        Map<String, Object> statsPayload = Map.of(
                "reviewsCount", 0,
                "overallRating", 0,
                "hostingMonths", 0,
                "activeListingsCount", 0
        );

        Map<String, Object> reviewsPayload = Map.of(
                "items", List.of(),
                "page", 0,
                "size", 6,
                "totalElements", 0
        );

        Map<String, Object> listingsPayload = Map.of(
                "items", List.of(),
                "page", 0,
                "size", 8,
                "totalElements", 0
        );

        return Map.of(
                "host", hostPayload,
                "stats", statsPayload,
                "reviews", reviewsPayload,
                "listings", listingsPayload
        );
    }
}
