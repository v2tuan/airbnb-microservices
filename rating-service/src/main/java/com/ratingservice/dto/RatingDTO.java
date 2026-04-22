package com.ratingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RatingDTO {
  private String id;
  private String listingId;
  private String userId;
  private String hostId;
  private Double overallRating;
  private Double cleanliness;
  private Double accuracy;
  private Double checkIn;
  private Double communication;
  private Double location;
  private Double value;
  private String review;
  private String reviewerFullName;
  private String reviewerAvatarUrl;
  private String reviewerLocation;
  private LocalDateTime createdAt;
}


