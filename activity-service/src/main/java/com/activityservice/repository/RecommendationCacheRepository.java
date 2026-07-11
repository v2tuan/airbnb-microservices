package com.activityservice.repository;

import com.activityservice.model.UserRecommendationCache;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendationCacheRepository extends JpaRepository<UserRecommendationCache, Long> {

  List<UserRecommendationCache> findByKeycloakUserIdAndCalculatedAtAfterOrderByRankPositionAsc(
      String keycloakUserId,
      Instant calculatedAtAfter);

  void deleteByKeycloakUserId(String keycloakUserId);
}
