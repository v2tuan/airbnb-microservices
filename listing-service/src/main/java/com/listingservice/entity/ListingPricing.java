package com.listingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "listing_pricing", indexes = {
    @Index(name = "idx_listing_pricing_listing", columnList = "listing_id")
})
public class ListingPricing extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "pricing_id")
    UUID pricingId;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id", nullable = false, unique = true)
    Listing listing;
    
    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    BigDecimal basePrice;
    
    @Column(nullable = false, length = 3)
    @Builder.Default
    String currency = "VND";
    
    @Column(name = "cleaning_fee", precision = 10, scale = 2)
    @Builder.Default
    BigDecimal cleaningFee = BigDecimal.ZERO;
    
    @Column(name = "service_fee_percentage", precision = 5, scale = 2)
    @Builder.Default
    BigDecimal serviceFeePercentage = BigDecimal.ZERO;
    
    @Column(name = "weekend_price", precision = 10, scale = 2)
    BigDecimal weekendPrice;
    
    @Column(name = "weekly_discount", precision = 5, scale = 2)
    BigDecimal weeklyDiscount;
    
    @Column(name = "monthly_discount", precision = 5, scale = 2)
    BigDecimal monthlyDiscount;
}