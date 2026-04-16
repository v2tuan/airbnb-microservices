package com.ratingservice.service;

import com.ratingservice.dto.RatingDTO;
import java.util.List;

public interface RatingService {
  RatingDTO createRating(RatingDTO ratingDTO);
  RatingDTO getRating(String id);
  List<RatingDTO> getRatingsByListing(String listingId);
  Double getAverageRating(String listingId);
  RatingDTO updateRating(String id, RatingDTO ratingDTO);
  void deleteRating(String id);
}
