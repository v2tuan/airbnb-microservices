package com.ratingservice.service;

import com.ratingservice.dto.RatingDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface RatingService {
  RatingDTO createRating(RatingDTO ratingDTO);
  RatingDTO getRating(String id);
  List<RatingDTO> getRatingsByListing(String listingId);
  Double getAverageRating(String listingId);
  RatingDTO updateRating(String id, RatingDTO ratingDTO);
  void deleteRating(String id);

  /**
   * Get paginated reviews for a host
   */
  Page<RatingDTO> getReviewsByHost(String hostId, Pageable pageable);

  /**
   * Get rating summary (count and overall rating) for a host
   */
  Map<String, Object> getHostRatingSummary(String hostId);
}
