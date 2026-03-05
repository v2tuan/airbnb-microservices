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
@Table(name = "listing_photos", indexes = {
    @Index(name = "idx_listing_photos_listing", columnList = "listing_id"),
    @Index(name = "idx_listing_photos_order", columnList = "listing_id, display_order")
})
public class ListingPhoto {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "photo_id")
    UUID photoId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id", nullable = false)
    Listing listing;
    
    @Column(name = "photo_url", nullable = false, columnDefinition = "TEXT")
    String photoUrl;
    
    @Column(length = 255)
    String caption;
    
    @Column(name = "display_order", nullable = false)
    Integer displayOrder;
    
    @Column(name = "is_cover", nullable = false)
    @Builder.Default
    Boolean isCover = false;
    
    @Column(name = "uploaded_at", nullable = false)
    @Builder.Default
    LocalDateTime uploadedAt = LocalDateTime.now();
}