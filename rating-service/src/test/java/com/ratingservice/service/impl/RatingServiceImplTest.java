package com.ratingservice.service.impl;

import com.ratingservice.client.UserProfileClient;
import com.ratingservice.dto.RatingDTO;
import com.ratingservice.dto.UserProfileDTO;
import com.ratingservice.entity.Rating;
import com.ratingservice.repository.RatingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RatingServiceImplTest {

  @Mock
  private RatingRepository ratingRepository;

  @Mock
  private UserProfileClient userProfileClient;

  @InjectMocks
  private RatingServiceImpl ratingService;

  @Test
  void createRating_shouldEnrichReviewerInfo() {
    Rating rating = new Rating();
    rating.setId("rating-1");
    rating.setListingId("listing-1");
    rating.setUserId("kc-user-1");
    rating.setReview("Great stay");
    rating.setOverallRating(5.0);

    when(ratingRepository.save(org.mockito.ArgumentMatchers.any(Rating.class))).thenReturn(rating);
    when(userProfileClient.getByKeycloakUserId("kc-user-1"))
        .thenReturn(Optional.of(new UserProfileDTO(null, "kc-user-1", "Nguyen Van A", "https://img.example/avatar.png", false, null)));

    RatingDTO response = ratingService.createRating(new RatingDTO(
        null,
        "listing-1",
        "kc-user-1",
        "host-1",
        5.0,
        5.0,
        5.0,
        5.0,
        5.0,
        5.0,
        5.0,
        "Great stay",
        null,
        null,
        null,
        null));

    assertEquals("Nguyen Van A", response.getReviewerFullName());
    assertEquals("https://img.example/avatar.png", response.getReviewerAvatarUrl());
  }

  @Test
  void getRatingsByListing_shouldUseBatchUserProfiles() {
    Rating first = new Rating();
    first.setId("rating-1");
    first.setListingId("listing-1");
    first.setUserId("kc-user-1");
    first.setReview("First");

    Rating second = new Rating();
    second.setId("rating-2");
    second.setListingId("listing-1");
    second.setUserId("kc-user-2");
    second.setReview("Second");

    when(ratingRepository.findByListingId("listing-1")).thenReturn(List.of(first, second));
    when(userProfileClient.getByKeycloakUserIds(anyCollection())).thenReturn(Map.of(
        "kc-user-1", new UserProfileDTO(null, "kc-user-1", "User One", "avatar-1", false, null),
        "kc-user-2", new UserProfileDTO(null, "kc-user-2", "User Two", "avatar-2", false, null)
    ));

    List<RatingDTO> response = ratingService.getRatingsByListing("listing-1");

    assertEquals("User One", response.get(0).getReviewerFullName());
    assertEquals("avatar-1", response.get(0).getReviewerAvatarUrl());
    assertEquals("User Two", response.get(1).getReviewerFullName());
    assertEquals("avatar-2", response.get(1).getReviewerAvatarUrl());
    verify(userProfileClient).getByKeycloakUserIds(anyCollection());
  }

  @Test
  void getRating_shouldAllowMissingUserProfile() {
    Rating rating = new Rating();
    rating.setId("rating-1");
    rating.setListingId("listing-1");
    rating.setUserId("kc-user-404");
    rating.setReview("Missing profile");

    when(ratingRepository.findById("rating-1")).thenReturn(Optional.of(rating));
    when(userProfileClient.getByKeycloakUserId("kc-user-404")).thenReturn(Optional.empty());

    RatingDTO response = ratingService.getRating("rating-1");

    assertNull(response.getReviewerFullName());
    assertNull(response.getReviewerAvatarUrl());
  }
}
