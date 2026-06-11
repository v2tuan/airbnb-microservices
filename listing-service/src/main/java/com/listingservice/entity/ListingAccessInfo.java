package com.listingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "listing_access_info", indexes = {
    @Index(name = "idx_listing_access_info_listing", columnList = "listing_id")
})
public class ListingAccessInfo extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "access_info_id")
    UUID accessInfoId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id", nullable = false, unique = true)
    Listing listing;

    @Column(name = "wifi_password", length = 255)
    String wifiPassword;

    @Column(name = "entry_code", length = 100)
    String entryCode;

    @Column(name = "smart_lock_instructions", columnDefinition = "TEXT")
    String smartLockInstructions;

    @Column(name = "key_pickup_instructions", columnDefinition = "TEXT")
    String keyPickupInstructions;

    @OneToMany(mappedBy = "accessInfo", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepNumber ASC")
    @Builder.Default
    List<ListingGuideStep> checkInGuide = new ArrayList<>();
}
