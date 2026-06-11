package com.ratingservice.entity;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ratings", indexes = {
  @Index(name = "idx_ratings_listing", columnList = "listing_id"),
  @Index(name = "idx_ratings_host_created", columnList = "host_id, created_at"),
  @Index(name = "idx_ratings_user", columnList = "user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Rating {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private String id;

  @Column(name = "listing_id")
  private String listingId;

  @Column(name = "user_id")
  private String userId;

  @Column(name = "host_id")
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
  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;
}


