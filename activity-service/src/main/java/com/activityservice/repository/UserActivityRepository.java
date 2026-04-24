package com.activityservice.repository;

import com.activityservice.model.UserActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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

