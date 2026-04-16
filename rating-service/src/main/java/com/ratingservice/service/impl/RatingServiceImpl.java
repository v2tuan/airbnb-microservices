package com.ratingservice.service.impl;

import com.ratingservice.dto.RatingDTO;
import com.ratingservice.entity.Rating;
import com.ratingservice.repository.RatingRepository;
import com.ratingservice.service.RatingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RatingServiceImpl implements RatingService {

  @Autowired
  private RatingRepository ratingRepository;

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
    return convertToDTO(savedRating);
  }

  @Override
  public RatingDTO getRating(String id) {
    Rating rating = ratingRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("Rating not found with id: " + id));
    return convertToDTO(rating);
  }

  @Override
  public List<RatingDTO> getRatingsByListing(String listingId) {
    List<Rating> ratings = ratingRepository.findByListingId(listingId);
    return ratings.stream()
        .map(this::convertToDTO)
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
    return convertToDTO(updatedRating);
  }

  @Override
  public void deleteRating(String id) {
    if (!ratingRepository.existsById(id)) {
      throw new RuntimeException("Rating not found with id: " + id);
    }
    ratingRepository.deleteById(id);
  }

  private RatingDTO convertToDTO(Rating rating) {
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
    return dto;
  }
}
