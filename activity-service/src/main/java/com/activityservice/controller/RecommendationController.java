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

  @GetMapping("/users/{userId}")
  public RecommendationResponse recommendForUser(
      @PathVariable String userId,
      @RequestParam(defaultValue = "10") Integer limit) {
    return new RecommendationResponse(userId, collaborativeFilteringService.recommend(userId, limit));
  }
}

