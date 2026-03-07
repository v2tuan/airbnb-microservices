package com.listingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "availability_calendar", indexes = {
    @Index(name = "idx_availability_listing", columnList = "listing_id"),
    @Index(name = "idx_availability_date", columnList = "listing_id, date")
})
public class AvailabilityCalendar {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "availability_id")
    UUID availabilityId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id", nullable = false)
    Listing listing;
    
    @Column(nullable = false)
    LocalDate date;
    
    @Column(name = "is_available", nullable = false)
    @Builder.Default
    Boolean isAvailable = true;
    
    @Column(name = "min_nights", nullable = false)
    @Builder.Default
    Integer minNights = 1;
    
    @Column(name = "max_nights")
    Integer maxNights;
    
    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    LocalDateTime updatedAt = LocalDateTime.now();
}