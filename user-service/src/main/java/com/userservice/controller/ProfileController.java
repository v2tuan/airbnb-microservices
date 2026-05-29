package com.userservice.controller;

import com.userservice.dto.response.PublicHostResponseDTO;
import com.userservice.service.PublicProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final PublicProfileService publicProfileService;

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getProfile(
            @PathVariable String id,
            @RequestParam(defaultValue = "0") int reviewPage,
            @RequestParam(defaultValue = "0") int listingPage) {
        return publicProfileService.getProfilePayload(id, reviewPage, listingPage)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
