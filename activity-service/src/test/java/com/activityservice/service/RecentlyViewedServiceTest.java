package com.activityservice.service;

import com.activityservice.model.ActivityEventType;
import com.activityservice.model.UserActivity;
import com.activityservice.repository.UserActivityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecentlyViewedServiceTest {

  @Mock
  private UserActivityRepository userActivityRepository;

  private RecentlyViewedService recentlyViewedService;

  @BeforeEach
  void setUp() {
    recentlyViewedService = new RecentlyViewedService(userActivityRepository);
  }

  @Test
  void getRecentlyViewedReturnsLatestUniqueViewedListings() {
    Instant now = Instant.parse("2026-06-28T03:00:00Z");
    when(userActivityRepository.findByKeycloakUserIdAndEventTypeOrderByCreatedAtDesc(
        eq("u1"),
        eq(ActivityEventType.VIEW),
        any()
    )).thenReturn(List.of(
        activity("A", now),
        activity("A", now.minusSeconds(60)),
        activity("B", now.minusSeconds(120))
    ));

    var result = recentlyViewedService.getRecentlyViewed("u1", 2);

    assertThat(result).hasSize(2);
    assertThat(result).extracting(item -> item.listingId()).containsExactly("A", "B");
  }

  @Test
  void getRecentlyViewedReturnsGlobalRecentViewsForAnonymousUser() {
    Instant now = Instant.parse("2026-06-28T03:00:00Z");
    when(userActivityRepository.findByEventTypeOrderByCreatedAtDesc(
        eq(ActivityEventType.VIEW),
        any()
    )).thenReturn(List.of(
        activity("C", now),
        activity("D", now.minusSeconds(60))
    ));

    var result = recentlyViewedService.getRecentlyViewed("__anonymous__", 2);

    assertThat(result).hasSize(2);
    assertThat(result).extracting(item -> item.listingId()).containsExactly("C", "D");
  }

  private static UserActivity activity(String listingId, Instant createdAt) {
    UserActivity activity = new UserActivity();
    activity.setKeycloakUserId("u1");
    activity.setListingId(listingId);
    activity.setEventType(ActivityEventType.VIEW);
    activity.setEventWeight(1.0);

    try {
      var field = UserActivity.class.getDeclaredField("createdAt");
      field.setAccessible(true);
      field.set(activity, createdAt);
    } catch (ReflectiveOperationException ex) {
      throw new IllegalStateException(ex);
    }

    return activity;
  }
}
