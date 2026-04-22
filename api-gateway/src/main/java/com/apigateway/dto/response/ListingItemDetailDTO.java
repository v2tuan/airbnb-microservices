package com.apigateway.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO mapping listing item từ listing-service (dùng cho host profile)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListingItemDetailDTO {
    private String id;
    private String title;

    @JsonProperty("thumbnail_url")
    private String thumbnailUrl;

    private String city;

    @JsonProperty("short_features")
    private String shortFeatures;

    @JsonProperty("avg_rating")
    private Double avgRating;

    @JsonProperty("review_count")
    private Long reviewCount;
}

