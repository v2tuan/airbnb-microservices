package com.activityservice.service;

import com.activityservice.dto.RecommendationItemResponse;
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

  private CollaborativeFilteringService collaborativeFilteringService;

  @BeforeEach
  void setUp() {
    collaborativeFilteringService = new CollaborativeFilteringService(userActivityRepository);
  }

  @Test
  void recommendUsesCollaborativeFilteringWhenNeighborsOverlap() {
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

  private static UserActivityRepository.UserListingWeightProjection userListingWeight(
      String userId,
      String listingId,
      double weight) {
    return new UserActivityRepository.UserListingWeightProjection() {
      @Override
      public String getUserId() {
        return userId;
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
}

