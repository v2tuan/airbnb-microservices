package com.listingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
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
@Table(name = "custom_pricing",
    uniqueConstraints = @UniqueConstraint(name = "unique_listing_date", columnNames = {"listing_id", "date"}),
    indexes = @Index(name = "idx_custom_pricing_listing", columnList = "listing_id")
)
public class CustomPricing {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "custom_pricing_id")
    UUID customPricingId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id", nullable = false)
    Listing listing;
    
    @Column(nullable = false)
    LocalDate date;
    
    @Column(nullable = false, precision = 10, scale = 2)
    BigDecimal price;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    LocalDateTime createdAt = LocalDateTime.now();
}