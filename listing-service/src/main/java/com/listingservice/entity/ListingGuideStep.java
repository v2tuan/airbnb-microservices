package com.listingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "listing_guide_steps", indexes = {
    @Index(name = "idx_listing_guide_steps_access_info", columnList = "access_info_id")
})
public class ListingGuideStep extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "guide_step_id")
    UUID guideStepId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "access_info_id", nullable = false)
    ListingAccessInfo accessInfo;

    @Column(name = "step_number", nullable = false)
    Integer stepNumber;

    @Column(nullable = false, length = 150)
    String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    String description;

    @Column(name = "image_url", columnDefinition = "TEXT")
    String imageUrl;
}
