package com.listingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "listing_amenities", 
    uniqueConstraints = @UniqueConstraint(name = "unique_listing_amenity", columnNames = {"listing_id", "amenity_id"}),
    indexes = @Index(name = "idx_listing_amenities_listing", columnList = "listing_id")
)
public class ListingAmenity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "listing_amenity_id")
    UUID listingAmenityId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id", nullable = false)
    Listing listing;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "amenity_id", nullable = false)
    Amenity amenity;
    
    @Column(name = "added_at", nullable = false)
    @Builder.Default
    LocalDateTime addedAt = LocalDateTime.now();
}