package com.activityservice.repository;

import com.activityservice.model.UserActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface UserActivityRepository extends JpaRepository<UserActivity, Long> {

  interface UserListingWeightProjection {
    String getUserId();

    String getListingId();

    double getWeight();
  }

  interface ListingPopularityProjection {
    String getListingId();

    double getWeight();
  }

  List<UserActivity> findByUserId(String userId);

  List<UserActivity> findByUserIdAndEventTypeOrderByCreatedAtDesc(
      String userId,
      com.activityservice.model.ActivityEventType eventType,
      Pageable pageable);

  List<UserActivity> findByEventTypeOrderByCreatedAtDesc(
      com.activityservice.model.ActivityEventType eventType,
      Pageable pageable);

  @Query("""
      select ua.userId as userId, ua.listingId as listingId, sum(ua.eventWeight) as weight
      from UserActivity ua
      group by ua.userId, ua.listingId
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

