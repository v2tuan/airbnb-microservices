package com.activityservice.controller;

import com.activityservice.dto.RecommendationResponse;
import com.activityservice.service.CollaborativeFilteringService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/recommendations")
public class RecommendationController {

  private final CollaborativeFilteringService collaborativeFilteringService;

  public RecommendationController(CollaborativeFilteringService collaborativeFilteringService) {
    this.collaborativeFilteringService = collaborativeFilteringService;
  }

  @GetMapping("/users/{keycloakUserId}")
  public RecommendationResponse recommendForUser(
      @PathVariable String keycloakUserId,
      @RequestParam(defaultValue = "10") Integer limit) {
    return new RecommendationResponse(
        keycloakUserId,
        collaborativeFilteringService.recommend(keycloakUserId, limit));
  }
}

