package com.activityservice.service;

import com.activityservice.dto.RecommendationItemResponse;
import com.activityservice.model.UserRecommendationCache;
import com.activityservice.repository.RecommendationCacheRepository;
import com.activityservice.repository.UserActivityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CollaborativeFilteringServiceTest {

  @Mock
  private UserActivityRepository userActivityRepository;

  @Mock
  private RecommendationCacheRepository recommendationCacheRepository;

  private CollaborativeFilteringService collaborativeFilteringService;

  @BeforeEach
  void setUp() {
    collaborativeFilteringService = new CollaborativeFilteringService(
        userActivityRepository,
        recommendationCacheRepository);
  }

  @Test
  void recommendUsesCollaborativeFilteringWhenNeighborsOverlap() {
    when(recommendationCacheRepository.findByKeycloakUserIdAndCalculatedAtAfterOrderByRankPositionAsc(
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.any()
    )).thenReturn(List.of());
    when(userActivityRepository.findAllUserListingWeights()).thenReturn(List.of(
        userListingWeight("u1", "A", 8.0),
        userListingWeight("u1", "B", 4.0),
        userListingWeight("u2", "A", 8.0),
        userListingWeight("u2", "C", 8.0),
        userListingWeight("u3", "B", 4.0),
        userListingWeight("u3", "D", 8.0)
    ));
    when(userActivityRepository.findListingPopularity()).thenReturn(List.of(
        popularity("C", 8.0),
        popularity("D", 8.0)
    ));

    List<RecommendationItemResponse> result = collaborativeFilteringService.recommend("u1", 2);

    assertThat(result).hasSize(2);
    assertThat(result.getFirst().listingId()).isEqualTo("C");
    assertThat(result.getFirst().source()).isEqualTo("COLLABORATIVE_FILTERING");
  }

  @Test
  void recommendUsesColdStartFallbackWhenUserHasNoHistory() {
    when(recommendationCacheRepository.findByKeycloakUserIdAndCalculatedAtAfterOrderByRankPositionAsc(
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.any()
    )).thenReturn(List.of());
    when(userActivityRepository.findAllUserListingWeights()).thenReturn(List.of(
        userListingWeight("u2", "C", 8.0)
    ));
    when(userActivityRepository.findListingPopularity()).thenReturn(List.of(
        popularity("C", 8.0),
        popularity("D", 7.0)
    ));

    List<RecommendationItemResponse> result = collaborativeFilteringService.recommend("new-user", 2);

    assertThat(result).hasSize(2);
    assertThat(result).allMatch(item -> item.source().equals("POPULARITY_COLD_START"));
    assertThat(result.getFirst().listingId()).isEqualTo("C");
  }

  @Test
  void recommendUsesSparseFallbackWhenNoNeighborContributesCandidates() {
    when(recommendationCacheRepository.findByKeycloakUserIdAndCalculatedAtAfterOrderByRankPositionAsc(
        org.mockito.ArgumentMatchers.anyString(),
        org.mockito.ArgumentMatchers.any()
    )).thenReturn(List.of());
    when(userActivityRepository.findAllUserListingWeights()).thenReturn(List.of(
        userListingWeight("u1", "A", 8.0),
        userListingWeight("u2", "B", 8.0)
    ));
    when(userActivityRepository.findListingPopularity()).thenReturn(List.of(
        popularity("B", 8.0),
        popularity("C", 5.0)
    ));

    List<RecommendationItemResponse> result = collaborativeFilteringService.recommend("u1", 2);

    assertThat(result).hasSize(2);
    assertThat(result).allMatch(item -> item.source().equals("POPULARITY_SPARSE"));
    assertThat(result).extracting(RecommendationItemResponse::listingId).containsExactly("B", "C");
  }

  @Test
  void recommendReturnsCachedRecommendationsWithoutRecomputingMatrix() {
    when(recommendationCacheRepository.findByKeycloakUserIdAndCalculatedAtAfterOrderByRankPositionAsc(
        org.mockito.ArgumentMatchers.eq("u1"),
        org.mockito.ArgumentMatchers.any()
    )).thenReturn(List.of(
        cache("u1", "A", 1, 4.9, "COLLABORATIVE_FILTERING"),
        cache("u1", "B", 2, 4.2, "POPULARITY_BACKFILL")
    ));

    List<RecommendationItemResponse> result = collaborativeFilteringService.recommend("u1", 10);

    assertThat(result).extracting(RecommendationItemResponse::listingId).containsExactly("A", "B");
  }

  private static UserActivityRepository.UserListingWeightProjection userListingWeight(
      String keycloakUserId,
      String listingId,
      double weight) {
    return new UserActivityRepository.UserListingWeightProjection() {
      @Override
      public String getKeycloakUserId() {
        return keycloakUserId;
      }

      @Override
      public String getListingId() {
        return listingId;
      }

      @Override
      public double getWeight() {
        return weight;
      }
    };
  }

  private static UserActivityRepository.ListingPopularityProjection popularity(String listingId, double weight) {
    return new UserActivityRepository.ListingPopularityProjection() {
      @Override
      public String getListingId() {
        return listingId;
      }

      @Override
      public double getWeight() {
        return weight;
      }
    };
  }

  private static UserRecommendationCache cache(
      String userId,
      String listingId,
      int rank,
      double score,
      String source) {
    UserRecommendationCache cache = new UserRecommendationCache();
    cache.setKeycloakUserId(userId);
    cache.setListingId(listingId);
    cache.setRankPosition(rank);
    cache.setScore(score);
    cache.setSource(source);
    cache.setCalculatedAt(java.time.Instant.now());
    return cache;
  }
}

