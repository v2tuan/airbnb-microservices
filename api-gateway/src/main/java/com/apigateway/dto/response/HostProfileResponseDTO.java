package com.apigateway.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HostProfileResponseDTO {

    @JsonProperty("host")
    private HostInfoDTO hostInfo;

    @JsonProperty("stats")
    private HostStatsDTO stats;

    @JsonProperty("reviews")
    private PagedReviewsDTO reviews;

    @JsonProperty("listings")
    private PagedListingsDTO listings;

    // ============ NESTED DTOs ============

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HostInfoDTO {
        private String id;
        private String fullName;
        private String avatarUrl;
        private Boolean isSuperhost;
        private Boolean identityVerified;
        private String location; // city
        private Instant hostSince;
        private String responseRate;
        private String responseTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HostStatsDTO {
        private Long reviewsCount;
        private Double overallRating;
        private Long hostingMonths;
        private Long activeListingsCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PagedReviewsDTO {
        private List<ReviewItemDTO> items;
        private Integer page;
        private Integer size;
        private Long totalElements;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewItemDTO {
        private String id;
        private String listingId;
        private String reviewerName;
        private String reviewerAvatarUrl;
        private String reviewerLocation;
        private Instant createdAt;
        private String comment;
        private Double rating;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PagedListingsDTO {
        private List<ListingItemDTO> items;
        private Integer page;
        private Integer size;
        private Long totalElements;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListingItemDTO {
        private String id;
        private String title;
        private String thumbnailUrl;
        private String city;
        private String shortFeatures;
        private Double avgRating;
        private Long reviewCount;
    }
}

