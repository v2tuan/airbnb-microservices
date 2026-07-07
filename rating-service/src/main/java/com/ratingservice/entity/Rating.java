package com.ratingservice.entity;


import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ratings", indexes = {
  @Index(name = "idx_ratings_listing", columnList = "listing_id"),
  @Index(name = "idx_ratings_host_created", columnList = "host_id, created_at"),
  @Index(name = "idx_ratings_user", columnList = "user_id"),
  @Index(name = "idx_ratings_booking", columnList = "booking_id")
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

  @Column(name = "booking_id", unique = true)
  private String bookingId;

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

  @OneToMany(mappedBy = "rating", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sortOrder ASC, createdAt ASC")
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private List<RatingPhoto> photos = new ArrayList<>();

  public void replacePhotos(List<RatingPhoto> nextPhotos) {
    photos.clear();
    if (nextPhotos == null) {
      return;
    }
    nextPhotos.forEach(this::addPhoto);
  }

  public void addPhoto(RatingPhoto photo) {
    if (photo == null) {
      return;
    }
    photo.setRating(this);
    photos.add(photo);
  }
}


