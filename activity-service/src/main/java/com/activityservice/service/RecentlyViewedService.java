package com.activityservice.service;

import com.activityservice.dto.RecentlyViewedItemResponse;
import com.activityservice.model.ActivityEventType;
import com.activityservice.model.UserActivity;
import com.activityservice.repository.UserActivityRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class RecentlyViewedService {

  private static final int DEFAULT_LIMIT = 10;
  private static final int MAX_LIMIT = 100;
  private static final String ANONYMOUS_USER_ID = "__anonymous__";

  private final UserActivityRepository userActivityRepository;

  public RecentlyViewedService(UserActivityRepository userActivityRepository) {
    this.userActivityRepository = userActivityRepository;
  }

  public List<RecentlyViewedItemResponse> getRecentlyViewed(String keycloakUserId, Integer limit) {
    int safeLimit = normalizeLimit(limit);
    int fetchSize = Math.min(Math.max(safeLimit * 5, safeLimit), MAX_LIMIT);

    List<UserActivity> activities = ANONYMOUS_USER_ID.equals(keycloakUserId) || keycloakUserId == null || keycloakUserId.isBlank()
        ? userActivityRepository.findByEventTypeOrderByCreatedAtDesc(
            ActivityEventType.VIEW,
            PageRequest.of(0, fetchSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        )
        : userActivityRepository.findByKeycloakUserIdAndEventTypeOrderByCreatedAtDesc(
            keycloakUserId,
            ActivityEventType.VIEW,
            PageRequest.of(0, fetchSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

    Map<String, RecentlyViewedItemResponse> uniqueListings = new LinkedHashMap<>();
    for (UserActivity activity : activities) {
      if (activity == null || activity.getListingId() == null || activity.getListingId().isBlank()) {
        continue;
      }

      uniqueListings.putIfAbsent(
          activity.getListingId(),
          new RecentlyViewedItemResponse(activity.getListingId(), activity.getCreatedAt())
      );

      if (uniqueListings.size() >= safeLimit) {
        break;
      }
    }

    return new ArrayList<>(uniqueListings.values());
  }

  private int normalizeLimit(Integer limit) {
    if (limit == null || limit < 1) {
      return DEFAULT_LIMIT;
    }
    return Math.min(limit, MAX_LIMIT);
  }
}
