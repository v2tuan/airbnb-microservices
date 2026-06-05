package com.listingservice.dto.response;

import com.listingservice.constant.ListingStatus;
import com.listingservice.constant.PropertyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Compact DTO for listing item when displaying on host profile page
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListingItemResponse {
    private String id;
    private String title;
    private String thumbnailUrl;
    private String city;
    private String country;
    private PropertyType propertyType;
    private ListingStatus status;
    private LocalDateTime createdAt;
    private String shortFeatures;
    private Double avgRating;
    private Long reviewCount;
}

