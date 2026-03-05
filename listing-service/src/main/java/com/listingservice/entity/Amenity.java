package com.listingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import com.listingservice.constant.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "amenities", indexes = {
    @Index(name = "idx_amenities_category", columnList = "category")
})
public class Amenity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "amenity_id")
    UUID amenityId;
    
    @Column(nullable = false, unique = true, length = 100)
    String name;
    
    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    AmenityCategory category;
    
    @Column(name = "icon_url", columnDefinition = "TEXT")
    String iconUrl;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    LocalDateTime createdAt = LocalDateTime.now();
    
    @OneToMany(mappedBy = "amenity", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    Set<ListingAmenity> listingAmenities = new HashSet<>();
}