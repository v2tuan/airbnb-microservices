package com.listingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
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
@Table(name = "listings", indexes = {
    @Index(name = "idx_listings_host", columnList = "host_id"),
    @Index(name = "idx_listings_status", columnList = "status"),
    @Index(name = "idx_listings_location", columnList = "city, country")
})
public class Listing extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "listing_id")
    UUID listingId;
    
    @Column(name = "host_id", nullable = false)
    String hostId;  // Keycloak user ID
    
    @Column(nullable = false, length = 255)
    String title;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    String description;
    
    @Column(name = "property_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    PropertyType propertyType;
    
    @Column(name = "room_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    RoomType roomType;
    
    @Column(name = "num_bedrooms", nullable = false)
    Integer numBedrooms;
    
    @Column(name = "num_beds", nullable = false)
    Integer numBeds;
    
    @Column(name = "num_bathrooms", nullable = false, precision = 3, scale = 1)
    BigDecimal numBathrooms;
    
    @Column(name = "max_guests", nullable = false)
    Integer maxGuests;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    String address;
    
    @Column(nullable = false, length = 100)
    String city;
    
    @Column(length = 100)
    String state;
    
    @Column(nullable = false, length = 100)
    String country;
    
    @Column(name = "postal_code", length = 20)
    String postalCode;
    
    @Column(nullable = false, precision = 10, scale = 8)
    BigDecimal latitude;
    
    @Column(nullable = false, precision = 11, scale = 8)
    BigDecimal longitude;
    
    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    ListingStatus status = ListingStatus.DRAFT;
    
    @Column(name = "instant_book", nullable = false)
    @Builder.Default
    Boolean instantBook = false;
    
    @OneToMany(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    Set<ListingPhoto> photos = new HashSet<>();
    
    @OneToMany(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    Set<ListingAmenity> listingAmenities = new HashSet<>();
    
    @OneToOne(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    ListingPricing pricing;
    
    @OneToOne(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    HouseRules houseRules;
    
    @OneToMany(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    Set<CustomPricing> customPricing = new HashSet<>();
    
    @OneToMany(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    Set<AvailabilityCalendar> availabilityCalendar = new HashSet<>();
}
