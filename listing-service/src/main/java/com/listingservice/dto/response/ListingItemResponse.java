package com.listingservice.dto.response;

import com.listingservice.constant.ListingStatus;
import com.listingservice.constant.PropertyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

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

    public ListingItemResponse(
            UUID id,
            String title,
            String thumbnailUrl,
            String city,
            String country,
            PropertyType propertyType,
            ListingStatus status,
            LocalDateTime createdAt,
            String shortFeatures,
            Double avgRating,
            Long reviewCount
    ) {
        this.id = id != null ? id.toString() : null;
        this.title = title;
        this.thumbnailUrl = thumbnailUrl;
        this.city = city;
        this.country = country;
        this.propertyType = propertyType;
        this.status = status;
        this.createdAt = createdAt;
        this.shortFeatures = shortFeatures;
        this.avgRating = avgRating;
        this.reviewCount = reviewCount;
    }
}

