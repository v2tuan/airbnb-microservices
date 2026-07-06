package com.activityservice.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(
    name = "user_activities",
    indexes = {
      @Index(name = "idx_activity_user_id", columnList = "user_id"),
      @Index(name = "idx_activity_listing_id", columnList = "listing_id"),
      @Index(name = "idx_activity_created_at", columnList = "created_at")
    })
public class UserActivity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  // Stored identifier is the Keycloak subject; keep the legacy column name for now
  // because existing activity rows already live in this table.
  @Column(name = "user_id", nullable = false)
  private String keycloakUserId;

  @Column(name = "listing_id", nullable = false)
  private String listingId;

  @Enumerated(EnumType.STRING)
  @Column(name = "event_type", nullable = false)
  private ActivityEventType eventType;

  @Column(name = "event_weight", nullable = false)
  private double eventWeight;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
    if (eventType != null && eventWeight <= 0) {
      eventWeight = eventType.getWeight();
    }
  }

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

  public ActivityEventType getEventType() {
    return eventType;
  }

  public void setEventType(ActivityEventType eventType) {
    this.eventType = eventType;
  }

  public double getEventWeight() {
    return eventWeight;
  }

  public void setEventWeight(double eventWeight) {
    this.eventWeight = eventWeight;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}

