package com.activityservice.controller;

import com.activityservice.dto.RecentlyViewedResponse;
import com.activityservice.service.RecentlyViewedService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/activities")
public class RecentlyViewedController {

  private final RecentlyViewedService recentlyViewedService;

  public RecentlyViewedController(RecentlyViewedService recentlyViewedService) {
    this.recentlyViewedService = recentlyViewedService;
  }

  @GetMapping("/users/{userId}/recently-viewed")
  public RecentlyViewedResponse getRecentlyViewed(
      @PathVariable String userId,
      @RequestParam(defaultValue = "10") Integer limit) {
    return new RecentlyViewedResponse(userId, recentlyViewedService.getRecentlyViewed(userId, limit));
  }
}
