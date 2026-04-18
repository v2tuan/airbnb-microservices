package com.ratingservice.service.impl;

import com.ratingservice.client.UserProfileClient;
import com.ratingservice.dto.RatingDTO;
import com.ratingservice.dto.UserProfileDTO;
import com.ratingservice.entity.Rating;
import com.ratingservice.repository.RatingRepository;
import com.ratingservice.service.RatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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
    rating.setCreatedAt(LocalDateTime.now());
    rating.setUpdatedAt(LocalDateTime.now());

    Rating savedRating = ratingRepository.save(rating);
    return convertToDTO(savedRating, fetchUserProfile(savedRating.getUserId()));
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
    userProfile.ifPresent(profile -> {
      dto.setReviewerFullName(profile.fullName());
      dto.setReviewerAvatarUrl(profile.avatarUrl());
    });
    return dto;
  }

  private Optional<UserProfileDTO> fetchUserProfile(String userId) {
    if (userId == null || userId.isBlank()) {
      return Optional.empty();
    }
    return userProfileClient.getByKeycloakUserId(userId);
  }
}
