package com.activityservice.service;

import com.activityservice.dto.ActivityRequest;
import com.activityservice.model.UserActivity;
import com.activityservice.repository.UserActivityRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityIngestionService {

  private final UserActivityRepository userActivityRepository;

  public ActivityIngestionService(UserActivityRepository userActivityRepository) {
    this.userActivityRepository = userActivityRepository;
  }

  @Transactional
  public UserActivity save(ActivityRequest request) {
    UserActivity activity = new UserActivity();
    activity.setKeycloakUserId(request.keycloakUserId());
    activity.setListingId(request.listingId());
    activity.setEventType(request.eventType());
    activity.setEventWeight(request.eventType().getWeight());
    return userActivityRepository.save(activity);
  }

  @Transactional
  public List<UserActivity> saveAll(List<ActivityRequest> requests) {
    List<UserActivity> activities = requests.stream().map(this::toEntity).toList();
    return userActivityRepository.saveAll(activities);
  }

  private UserActivity toEntity(ActivityRequest request) {
    UserActivity activity = new UserActivity();
    activity.setKeycloakUserId(request.keycloakUserId());
    activity.setListingId(request.listingId());
    activity.setEventType(request.eventType());
    activity.setEventWeight(request.eventType().getWeight());
    return activity;
  }
}

