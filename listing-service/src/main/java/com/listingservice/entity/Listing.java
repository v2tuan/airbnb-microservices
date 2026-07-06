package com.listingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
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
    @Index(name = "idx_listings_location", columnList = "city, country"),
    @Index(name = "idx_listings_host_status_created", columnList = "host_id, status, created_at"),
    @Index(name = "idx_listings_search", columnList = "status, city, country, max_guests"),
    @Index(name = "idx_listings_status_city_instant_created", columnList = "status, city, instant_book, created_at")
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

    /**
     * Cancellation policy snapshot used by future cancellation quote/refund calculation.
     */
    @Column(name = "cancellation_policy_code", length = 30)
    private String cancellationPolicyCode = "FLEXIBLE";
    
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

    @Column(name = "check_in_start_time")
    LocalTime checkInStartTime;

    @Column(name = "check_in_end_time")
    LocalTime checkInEndTime;

    @Column(name = "check_out_time")
    LocalTime checkOutTime;

    @Column(name = "suspended_until")
    LocalDateTime suspendedUntil;

    @Column(name = "suspension_reason", length = 500)
    String suspensionReason;
    
    @OneToMany(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50)
    @Builder.Default
    Set<ListingPhoto> photos = new HashSet<>();
    
    @OneToMany(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50)
    @Builder.Default
    Set<ListingAmenity> listingAmenities = new HashSet<>();
    
    @OneToOne(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    ListingPricing pricing;
    
    @OneToOne(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    HouseRules houseRules;

    @OneToOne(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    ListingAccessInfo accessInfo;
    
    @OneToMany(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    Set<CustomPricing> customPricing = new HashSet<>();
    
    @OneToMany(mappedBy = "listing", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    Set<AvailabilityCalendar> availabilityCalendar = new HashSet<>();
}
