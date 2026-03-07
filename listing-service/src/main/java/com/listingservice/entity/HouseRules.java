package com.listingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "house_rules", indexes = {
    @Index(name = "idx_house_rules_listing", columnList = "listing_id")
})
public class HouseRules extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "rule_id")
    UUID ruleId;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id", nullable = false, unique = true)
    Listing listing;
    
    @Column(name = "check_in_from", nullable = false)
    LocalTime checkInFrom;
    
    @Column(name = "check_in_to", nullable = false)
    LocalTime checkInTo;
    
    @Column(name = "check_out_time", nullable = false)
    LocalTime checkOutTime;
    
    @Column(name = "smoking_allowed", nullable = false)
    @Builder.Default
    Boolean smokingAllowed = false;
    
    @Column(name = "pets_allowed", nullable = false)
    @Builder.Default
    Boolean petsAllowed = false;
    
    @Column(name = "parties_allowed", nullable = false)
    @Builder.Default
    Boolean partiesAllowed = false;
    
    @Column(name = "children_allowed", nullable = false)
    @Builder.Default
    Boolean childrenAllowed = true;
    
    @Column(name = "additional_rules", columnDefinition = "TEXT")
    String additionalRules;
}