package com.apigateway.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO mapping review item từ rating-service (dùng cho host profile)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingItemDTO {
    private String id;
    private String listingId;

    @JsonProperty("reviewer_full_name")
    private String reviewerFullName;

    @JsonProperty("reviewer_avatar_url")
    private String reviewerAvatarUrl;

    @JsonProperty("reviewer_location")
    private String reviewerLocation;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    private String review;

    @JsonProperty("overall_rating")
    private Double overallRating;
}

