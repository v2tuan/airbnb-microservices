package com.listingservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private String shortFeatures;
    private Double avgRating;
    private Long reviewCount;
}

