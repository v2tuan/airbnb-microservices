package com.activityservice.service;

import com.activityservice.dto.ActivityRequest;
import com.activityservice.model.UserActivity;
import com.activityservice.repository.RecommendationCacheRepository;
import com.activityservice.repository.UserActivityRepository;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityIngestionService {

  private final UserActivityRepository userActivityRepository;
  private final RecommendationCacheRepository recommendationCacheRepository;

  public ActivityIngestionService(
      UserActivityRepository userActivityRepository,
      RecommendationCacheRepository recommendationCacheRepository) {
    this.userActivityRepository = userActivityRepository;
    this.recommendationCacheRepository = recommendationCacheRepository;
  }

  @Transactional
  public UserActivity save(ActivityRequest request) {
    UserActivity activity = new UserActivity();
    activity.setKeycloakUserId(request.keycloakUserId());
    activity.setListingId(request.listingId());
    activity.setEventType(request.eventType());
    activity.setEventWeight(request.eventType().getWeight());
    UserActivity saved = userActivityRepository.save(activity);
    invalidateRecommendationCache(normalizeKeycloakUserIds(List.of(request.keycloakUserId())));
    return saved;
  }

  @Transactional
  public List<UserActivity> saveAll(List<ActivityRequest> requests) {
    List<UserActivity> activities = requests.stream().map(this::toEntity).toList();
    List<UserActivity> savedActivities = userActivityRepository.saveAll(activities);
    invalidateRecommendationCache(
        requests.stream()
            .map(ActivityRequest::keycloakUserId)
            .filter(id -> id != null && !id.isBlank())
            .collect(Collectors.toSet())
    );
    return savedActivities;
  }

  private UserActivity toEntity(ActivityRequest request) {
    UserActivity activity = new UserActivity();
    activity.setKeycloakUserId(request.keycloakUserId());
    activity.setListingId(request.listingId());
    activity.setEventType(request.eventType());
    activity.setEventWeight(request.eventType().getWeight());
    return activity;
  }

  private void invalidateRecommendationCache(Set<String> keycloakUserIds) {
    if (keycloakUserIds == null || keycloakUserIds.isEmpty()) {
      return;
    }

    keycloakUserIds.forEach(recommendationCacheRepository::deleteByKeycloakUserId);
  }

  private Set<String> normalizeKeycloakUserIds(List<String> keycloakUserIds) {
    if (keycloakUserIds == null || keycloakUserIds.isEmpty()) {
      return Set.of();
    }

    return keycloakUserIds.stream()
        .filter(id -> id != null && !id.isBlank())
        .collect(Collectors.toSet());
  }
}

