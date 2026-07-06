package com.activityservice.repository;

import com.activityservice.model.UserActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface UserActivityRepository extends JpaRepository<UserActivity, Long> {

  interface UserListingWeightProjection {
    String getKeycloakUserId();

    String getListingId();

    double getWeight();
  }

  interface ListingPopularityProjection {
    String getListingId();

    double getWeight();
  }

  List<UserActivity> findByKeycloakUserId(String keycloakUserId);

  List<UserActivity> findByKeycloakUserIdAndEventTypeOrderByCreatedAtDesc(
      String keycloakUserId,
      com.activityservice.model.ActivityEventType eventType,
      Pageable pageable);

  List<UserActivity> findByEventTypeOrderByCreatedAtDesc(
      com.activityservice.model.ActivityEventType eventType,
      Pageable pageable);

  @Query("""
      select ua.keycloakUserId as keycloakUserId, ua.listingId as listingId, sum(ua.eventWeight) as weight
      from UserActivity ua
      group by ua.keycloakUserId, ua.listingId
      """)
  List<UserListingWeightProjection> findAllUserListingWeights();

  @Query("""
      select ua.listingId as listingId, sum(ua.eventWeight) as weight
      from UserActivity ua
      group by ua.listingId
      order by sum(ua.eventWeight) desc
      """)
  List<ListingPopularityProjection> findListingPopularity();
}

