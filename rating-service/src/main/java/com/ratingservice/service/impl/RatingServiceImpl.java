package com.ratingservice.service.impl;

import com.ratingservice.client.BookingReviewClient;
import com.ratingservice.client.UserProfileClient;
import com.ratingservice.dto.BookingReviewContextDTO;
import com.ratingservice.dto.RatingDTO;
import com.ratingservice.dto.RatingPhotoDTO;
import com.ratingservice.dto.UserProfileDTO;
import com.ratingservice.entity.Rating;
import com.ratingservice.entity.RatingPhoto;
import com.ratingservice.repository.RatingRepository;
import com.ratingservice.service.RatingService;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RatingServiceImpl implements RatingService {

  private static final int MAX_REVIEW_PHOTOS = 5;
  private static final int MIN_REVIEW_LENGTH = 10;
  private static final int MAX_REVIEW_LENGTH = 2000;

  private final RatingRepository ratingRepository;
  private final UserProfileClient userProfileClient;
  private final BookingReviewClient bookingReviewClient;

  @Override
  @Transactional
  public RatingDTO createRating(RatingDTO ratingDTO) {
    if (ratingDTO == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating payload is required.");
    }

    Jwt jwt = currentJwt();
    String bookingId = requireText(ratingDTO.getBookingId(), "bookingId is required.");
    validateUuid(bookingId, "bookingId is invalid.");
    validateRatingInput(ratingDTO);

    BookingReviewContextDTO bookingContext = fetchReviewContext(jwt, bookingId);
    if (!bookingContext.canReview() || !"COMPLETED".equals(bookingContext.status())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Only completed bookings can be reviewed.");
    }

    if (ratingRepository.existsByBookingId(bookingContext.bookingId())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This booking has already been reviewed.");
    }

    Optional<UserProfileDTO> profile = fetchUserProfile(bookingContext.guestId());

    Rating rating = new Rating();
    rating.setListingId(bookingContext.listingId());
    rating.setUserId(bookingContext.guestId());
    rating.setHostId(bookingContext.hostId());
    rating.setBookingId(bookingContext.bookingId());
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
    rating.replacePhotos(toPhotoEntities(ratingDTO.getPhotos()));

    try {
      Rating savedRating = ratingRepository.save(rating);
      return convertToDTO(savedRating, profile);
    } catch (DataIntegrityViolationException exception) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "This booking has already been reviewed.", exception);
    }
  }

  @Override
  public RatingDTO getRating(String id) {
    Rating rating = ratingRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rating not found with id: " + id));
    return convertToDTO(rating, fetchUserProfile(rating.getUserId()));
  }

  @Override
  public RatingDTO getRatingByBooking(String bookingId) {
    Jwt jwt = currentJwt();
    String normalizedBookingId = requireText(bookingId, "bookingId is required.");
    validateUuid(normalizedBookingId, "bookingId is invalid.");
    BookingReviewContextDTO bookingContext = fetchReviewContext(jwt, normalizedBookingId);

    Rating rating = ratingRepository.findByBookingId(bookingContext.bookingId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found for this booking."));

    return convertToDTO(rating, fetchUserProfile(rating.getUserId()));
  }

  @Override
  @Transactional
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
    Object[] summary = ratingRepository.getListingRatingSummary(listingId);
    if (summary != null && summary.length > 1 && summary[1] != null) {
      return ((Number) summary[1]).doubleValue();
    }
    return 0.0;
  }

  @Override
  @Transactional
  public RatingDTO updateRating(String id, RatingDTO ratingDTO) {
    validateRatingInput(ratingDTO);
    Rating rating = ratingRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rating not found with id: " + id));
    ensureCanMutateRating(rating);

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
    if (ratingDTO.getPhotos() != null) {
      rating.replacePhotos(toPhotoEntities(ratingDTO.getPhotos()));
    }

    Rating updatedRating = ratingRepository.save(rating);
    return convertToDTO(updatedRating, fetchUserProfile(updatedRating.getUserId()));
  }

  @Override
  @Transactional
  public void deleteRating(String id) {
    Rating rating = ratingRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rating not found with id: " + id));
    ensureCanMutateRating(rating);
    ratingRepository.delete(rating);
  }

  @Override
  @Transactional
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

  @Override
  public Map<String, Map<String, Object>> getListingRatingSummaries(List<String> listingIds) {
    if (listingIds == null || listingIds.isEmpty()) {
      return Map.of();
    }

    List<String> distinctListingIds = listingIds.stream()
        .filter(id -> id != null && !id.isBlank())
        .distinct()
        .toList();

    if (distinctListingIds.isEmpty()) {
      return Map.of();
    }

    Map<String, Map<String, Object>> summaries = new HashMap<>();
    for (String listingId : distinctListingIds) {
      Map<String, Object> emptySummary = new HashMap<>();
      emptySummary.put("reviewCount", 0L);
      emptySummary.put("overallRating", 0.0);
      summaries.put(listingId, emptySummary);
    }

    ratingRepository.getListingRatingSummaries(distinctListingIds).forEach(summary -> {
      Map<String, Object> result = new HashMap<>();
      result.put("reviewCount", summary.getReviewCount() != null ? summary.getReviewCount() : 0L);
      result.put("overallRating", summary.getAvgRating() != null ? summary.getAvgRating() : 0.0);
      summaries.put(summary.getListingId(), result);
    });

    return summaries;
  }

  private RatingDTO convertToDTO(Rating rating, Optional<UserProfileDTO> userProfile) {
    RatingDTO dto = new RatingDTO();
    dto.setId(rating.getId());
    dto.setListingId(rating.getListingId());
    dto.setUserId(rating.getUserId());
    dto.setHostId(rating.getHostId());
    dto.setBookingId(rating.getBookingId());
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
    dto.setPhotos(toPhotoDTOs(rating.getPhotos()));
    return dto;
  }

  private List<RatingPhoto> toPhotoEntities(List<RatingPhotoDTO> photoDTOs) {
    if (photoDTOs == null || photoDTOs.isEmpty()) {
      return List.of();
    }

    if (photoDTOs.size() > MAX_REVIEW_PHOTOS) {
      throw new IllegalArgumentException("A review can include up to " + MAX_REVIEW_PHOTOS + " photos.");
    }

    LinkedHashSet<String> seenUrls = new LinkedHashSet<>();
    List<RatingPhoto> photos = new ArrayList<>();

    for (int index = 0; index < photoDTOs.size(); index++) {
      RatingPhotoDTO dto = photoDTOs.get(index);
      String imageUrl = dto != null ? trimToNull(dto.getImageUrl()) : null;
      if (imageUrl == null) {
        throw new IllegalArgumentException("Review photo URL is required.");
      }
      if (imageUrl.length() > 2048) {
        throw new IllegalArgumentException("Review photo URL is too long.");
      }
      if (!isHttpUrl(imageUrl)) {
        throw new IllegalArgumentException("Review photo URL must be an HTTP or HTTPS URL.");
      }
      if (!seenUrls.add(imageUrl)) {
        continue;
      }

      RatingPhoto photo = new RatingPhoto();
      photo.setImageUrl(imageUrl);
      photo.setPublicId(validatePublicId(trimToNull(dto.getPublicId())));
      photo.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : index);
      photo.setCreatedAt(dto.getCreatedAt() != null ? dto.getCreatedAt() : LocalDateTime.now());
      photos.add(photo);
    }

    return photos;
  }

  private List<RatingPhotoDTO> toPhotoDTOs(List<RatingPhoto> photos) {
    if (photos == null || photos.isEmpty()) {
      return List.of();
    }

    return photos.stream()
        .sorted(Comparator
            .comparing((RatingPhoto photo) -> photo.getSortOrder() != null ? photo.getSortOrder() : 0)
            .thenComparing(photo -> photo.getCreatedAt() != null ? photo.getCreatedAt() : LocalDateTime.MIN))
        .map(photo -> new RatingPhotoDTO(
            photo.getId(),
            photo.getImageUrl(),
            photo.getPublicId(),
            photo.getSortOrder(),
            photo.getCreatedAt()))
        .toList();
  }

  private boolean isHttpUrl(String value) {
    return value.startsWith("https://") || value.startsWith("http://");
  }

  private void validateRatingInput(RatingDTO ratingDTO) {
    if (ratingDTO == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating payload is required.");
    }

    validateScore(ratingDTO.getOverallRating(), "overallRating");
    validateScore(ratingDTO.getCleanliness(), "cleanliness");
    validateScore(ratingDTO.getAccuracy(), "accuracy");
    validateScore(ratingDTO.getCheckIn(), "checkIn");
    validateScore(ratingDTO.getCommunication(), "communication");
    validateScore(ratingDTO.getLocation(), "location");
    validateScore(ratingDTO.getValue(), "value");

    String review = requireText(ratingDTO.getReview(), "Review content is required.");
    if (review.length() < MIN_REVIEW_LENGTH) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Review content should be at least 10 characters.");
    }
    if (review.length() > MAX_REVIEW_LENGTH) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Review content is too long.");
    }
    ratingDTO.setReview(review);
  }

  private void validateScore(Double value, String fieldName) {
    if (value == null || value < 1 || value > 5) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be between 1 and 5.");
    }
  }

  private String validatePublicId(String publicId) {
    if (publicId != null && publicId.length() > 512) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Review photo publicId is too long.");
    }
    return publicId;
  }

  private BookingReviewContextDTO fetchReviewContext(Jwt jwt, String bookingId) {
    try {
      var response = bookingReviewClient.getReviewContext("Bearer " + jwt.getTokenValue(), bookingId);
      if (response == null || response.getData() == null) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found.");
      }
      return response.getData();
    } catch (FeignException.NotFound exception) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found.", exception);
    } catch (FeignException.Unauthorized exception) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required.", exception);
    } catch (FeignException.Forbidden exception) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot review this booking.", exception);
    } catch (FeignException.BadRequest exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid booking id.", exception);
    } catch (FeignException exception) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Booking service is unavailable.", exception);
    }
  }

  private void ensureCanMutateRating(Rating rating) {
    Jwt jwt = currentJwt();
    if (isAdmin(jwt)) {
      return;
    }
    if (rating.getUserId() == null || !rating.getUserId().equals(jwt.getSubject())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot modify this review.");
    }
  }

  private boolean isAdmin(Jwt jwt) {
    Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
    Object rolesClaim = realmAccess != null ? realmAccess.get("roles") : List.of();

    if (!(rolesClaim instanceof Collection<?> roles)) {
      return false;
    }

    return roles.stream()
        .filter(String.class::isInstance)
        .map(String.class::cast)
        .map(String::toUpperCase)
        .anyMatch(role -> role.equals("ADMIN") || role.equals("ROLE_ADMIN"));
  }

  private Jwt currentJwt() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required.");
    }
    return jwt;
  }

  private void validateUuid(String value, String message) {
    try {
      java.util.UUID.fromString(value);
    } catch (IllegalArgumentException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message, exception);
    }
  }

  private String requireText(String value, String message) {
    String trimmed = trimToNull(value);
    if (trimmed == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
    return trimmed;
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
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
