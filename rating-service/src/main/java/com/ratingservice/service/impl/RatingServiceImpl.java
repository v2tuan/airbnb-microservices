package com.ratingservice.service.impl;

import com.ratingservice.client.UserProfileClient;
import com.ratingservice.dto.RatingDTO;
import com.ratingservice.dto.UserProfileDTO;
import com.ratingservice.entity.Rating;
import com.ratingservice.repository.RatingRepository;
import com.ratingservice.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RatingServiceImpl implements RatingService {

  private final RatingRepository ratingRepository;
  private final UserProfileClient userProfileClient;

  @Override
  public RatingDTO createRating(RatingDTO ratingDTO) {
    Optional<UserProfileDTO> profile = fetchUserProfile(ratingDTO.getUserId());

    Rating rating = new Rating();
    rating.setListingId(ratingDTO.getListingId());
    rating.setUserId(ratingDTO.getUserId());
    rating.setHostId(ratingDTO.getHostId());
    rating.setOverallRating(ratingDTO.getOverallRating());
    rating.setCleanliness(ratingDTO.getCleanliness());
    rating.setAccuracy(ratingDTO.getAccuracy());
    rating.setCheckIn(ratingDTO.getCheckIn());
    rating.setCommunication(ratingDTO.getCommunication());
    rating.setLocation(ratingDTO.getLocation());
    rating.setValue(ratingDTO.getValue());
    rating.setReview(ratingDTO.getReview());
    rating.setReviewerFullName(firstDefined(
      ratingDTO.getReviewerFullName(),
      profile.map(UserProfileDTO::fullName).orElse(null)));
    rating.setReviewerAvatarUrl(firstDefined(
      ratingDTO.getReviewerAvatarUrl(),
      profile.map(UserProfileDTO::avatarUrl).orElse(null)));
    rating.setCreatedAt(LocalDateTime.now());
    rating.setUpdatedAt(LocalDateTime.now());

    Rating savedRating = ratingRepository.save(rating);
    return convertToDTO(savedRating, profile);
  }

  @Override
  public RatingDTO getRating(String id) {
    Rating rating = ratingRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Rating not found with id: " + id));
    return convertToDTO(rating, fetchUserProfile(rating.getUserId()));
  }

  @Override
  public List<RatingDTO> getRatingsByListing(String listingId) {
    List<Rating> ratings = ratingRepository.findByListingId(listingId);
    Map<String, UserProfileDTO> userProfiles = userProfileClient.getByKeycloakUserIds(
        ratings.stream()
            .map(Rating::getUserId)
            .filter(userId -> userId != null && !userId.isBlank())
            .distinct()
            .toList());

    List<Rating> snapshotUpdates = ratings.stream()
      .filter(rating -> (rating.getReviewerFullName() == null || rating.getReviewerFullName().isBlank()
          || rating.getReviewerAvatarUrl() == null || rating.getReviewerAvatarUrl().isBlank())
          && userProfiles.containsKey(rating.getUserId()))
      .peek(rating -> {
        UserProfileDTO profile = userProfiles.get(rating.getUserId());
        rating.setReviewerFullName(firstDefined(rating.getReviewerFullName(), profile.fullName()));
        rating.setReviewerAvatarUrl(firstDefined(rating.getReviewerAvatarUrl(), profile.avatarUrl()));
      })
      .filter(rating -> rating.getReviewerFullName() != null || rating.getReviewerAvatarUrl() != null)
      .toList();

    if (!snapshotUpdates.isEmpty()) {
      ratingRepository.saveAll(snapshotUpdates);
    }

    return ratings.stream()
        .map(rating -> convertToDTO(rating, Optional.ofNullable(userProfiles.get(rating.getUserId()))))
        .collect(Collectors.toList());
  }

  @Override
  public Double getAverageRating(String listingId) {
    List<Rating> ratings = ratingRepository.findByListingId(listingId);
    if (ratings.isEmpty()) {
      return 0.0;
    }
    return ratings.stream()
        .mapToDouble(Rating::getOverallRating)
        .average()
        .orElse(0.0);
  }

  @Override
  public RatingDTO updateRating(String id, RatingDTO ratingDTO) {
    Rating rating = ratingRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Rating not found with id: " + id));

    rating.setOverallRating(ratingDTO.getOverallRating());
    rating.setCleanliness(ratingDTO.getCleanliness());
    rating.setAccuracy(ratingDTO.getAccuracy());
    rating.setCheckIn(ratingDTO.getCheckIn());
    rating.setCommunication(ratingDTO.getCommunication());
    rating.setLocation(ratingDTO.getLocation());
    rating.setValue(ratingDTO.getValue());
    rating.setReview(ratingDTO.getReview());
    rating.setReviewerFullName(firstDefined(ratingDTO.getReviewerFullName(), rating.getReviewerFullName()));
    rating.setReviewerAvatarUrl(firstDefined(ratingDTO.getReviewerAvatarUrl(), rating.getReviewerAvatarUrl()));
    rating.setUpdatedAt(LocalDateTime.now());

    Rating updatedRating = ratingRepository.save(rating);
    return convertToDTO(updatedRating, fetchUserProfile(updatedRating.getUserId()));
  }

  @Override
  public void deleteRating(String id) {
    if (!ratingRepository.existsById(id)) {
      throw new RuntimeException("Rating not found with id: " + id);
    }
    ratingRepository.deleteById(id);
  }

  @Override
  public Page<RatingDTO> getReviewsByHost(String hostId, Pageable pageable) {
    Page<Rating> ratingsPage = ratingRepository.findByHostId(hostId, pageable);

    // Batch fetch user profiles for all reviewers
    Map<String, UserProfileDTO> userProfiles = userProfileClient.getByKeycloakUserIds(
        ratingsPage.getContent().stream()
            .map(Rating::getUserId)
            .filter(userId -> userId != null && !userId.isBlank())
            .distinct()
            .toList());

    // Update snapshot if needed
    List<Rating> snapshotUpdates = ratingsPage.getContent().stream()
        .filter(rating -> (rating.getReviewerFullName() == null || rating.getReviewerFullName().isBlank()
            || rating.getReviewerAvatarUrl() == null || rating.getReviewerAvatarUrl().isBlank())
            && userProfiles.containsKey(rating.getUserId()))
        .peek(rating -> {
          UserProfileDTO profile = userProfiles.get(rating.getUserId());
          rating.setReviewerFullName(firstDefined(rating.getReviewerFullName(), profile.fullName()));
          rating.setReviewerAvatarUrl(firstDefined(rating.getReviewerAvatarUrl(), profile.avatarUrl()));
        })
        .toList();

    if (!snapshotUpdates.isEmpty()) {
      ratingRepository.saveAll(snapshotUpdates);
    }

    return ratingsPage.map(rating -> convertToDTO(rating, Optional.ofNullable(userProfiles.get(rating.getUserId()))));
  }

  @Override
  public Map<String, Object> getHostRatingSummary(String hostId) {
    Object[] summary = ratingRepository.getHostRatingSummary(hostId);
    Map<String, Object> result = new HashMap<>();

    if (summary != null && summary.length > 0) {
      result.put("reviewCount", summary[0] != null ? ((Number) summary[0]).longValue() : 0L);
      result.put("overallRating", summary[1] != null ? ((Number) summary[1]).doubleValue() : 0.0);
    } else {
      result.put("reviewCount", 0L);
      result.put("overallRating", 0.0);
    }

    return result;
  }

  @Override
  public Map<String, Object> getListingRatingSummary(String listingId) {
    Object[] summary = ratingRepository.getListingRatingSummary(listingId);
    Map<String, Object> result = new HashMap<>();

    if (summary != null && summary.length > 0) {
      result.put("reviewCount", summary[0] != null ? ((Number) summary[0]).longValue() : 0L);
      result.put("overallRating", summary[1] != null ? ((Number) summary[1]).doubleValue() : 0.0);
    } else {
      result.put("reviewCount", 0L);
      result.put("overallRating", 0.0);
    }

    return result;
  }

  private RatingDTO convertToDTO(Rating rating, Optional<UserProfileDTO> userProfile) {
    RatingDTO dto = new RatingDTO();
    dto.setId(rating.getId());
    dto.setListingId(rating.getListingId());
    dto.setUserId(rating.getUserId());
    dto.setHostId(rating.getHostId());
    dto.setOverallRating(rating.getOverallRating());
    dto.setCleanliness(rating.getCleanliness());
    dto.setAccuracy(rating.getAccuracy());
    dto.setCheckIn(rating.getCheckIn());
    dto.setCommunication(rating.getCommunication());
    dto.setLocation(rating.getLocation());
    dto.setValue(rating.getValue());
    dto.setReview(rating.getReview());
    dto.setCreatedAt(rating.getCreatedAt());

    String fallbackFullName = userProfile.map(UserProfileDTO::fullName).orElse(null);
    String fallbackAvatarUrl = userProfile.map(UserProfileDTO::avatarUrl).orElse(null);
    dto.setReviewerFullName(firstDefined(rating.getReviewerFullName(), fallbackFullName));
    dto.setReviewerAvatarUrl(firstDefined(rating.getReviewerAvatarUrl(), fallbackAvatarUrl));
    dto.setReviewerLocation(rating.getReviewerLocation());
    return dto;
  }

  private String firstDefined(String primary, String fallback) {
    if (primary != null && !primary.isBlank()) {
      return primary;
    }
    if (fallback != null && !fallback.isBlank()) {
      return fallback;
    }
    return null;
  }

  private Optional<UserProfileDTO> fetchUserProfile(String userId) {
    if (userId == null || userId.isBlank()) {
      return Optional.empty();
    }
    return userProfileClient.getByKeycloakUserId(userId);
  }
}
