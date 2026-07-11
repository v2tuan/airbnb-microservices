package com.activityservice.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(
    name = "user_recommendation_cache",
    indexes = {
      @Index(name = "idx_reco_cache_user_id", columnList = "user_id"),
      @Index(name = "idx_reco_cache_user_rank", columnList = "user_id,rank_position"),
      @Index(name = "idx_reco_cache_calculated_at", columnList = "calculated_at")
    })
public class UserRecommendationCache {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private String keycloakUserId;

  @Column(name = "listing_id", nullable = false)
  private String listingId;

  @Column(name = "rank_position", nullable = false)
  private int rankPosition;

  @Column(name = "score", nullable = false)
  private double score;

  @Column(name = "source", nullable = false)
  private String source;

  @Column(name = "calculated_at", nullable = false, updatable = false)
  private Instant calculatedAt;

  public Long getId() {
    return id;
  }

  public String getKeycloakUserId() {
    return keycloakUserId;
  }

  public void setKeycloakUserId(String keycloakUserId) {
    this.keycloakUserId = keycloakUserId;
  }

  public String getListingId() {
    return listingId;
  }

  public void setListingId(String listingId) {
    this.listingId = listingId;
  }

  public int getRankPosition() {
    return rankPosition;
  }

  public void setRankPosition(int rankPosition) {
    this.rankPosition = rankPosition;
  }

  public double getScore() {
    return score;
  }

  public void setScore(double score) {
    this.score = score;
  }

  public String getSource() {
    return source;
  }

  public void setSource(String source) {
    this.source = source;
  }

  public Instant getCalculatedAt() {
    return calculatedAt;
  }

  public void setCalculatedAt(Instant calculatedAt) {
    this.calculatedAt = calculatedAt;
  }
}
