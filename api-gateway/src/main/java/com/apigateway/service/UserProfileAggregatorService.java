package com.apigateway.service;

import com.apigateway.client.ListingServiceClient;
import com.apigateway.client.RatingServiceClient;
import com.apigateway.client.UserServiceClient;
import com.apigateway.dto.response.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.time.Instant;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileAggregatorService {

    private final UserServiceClient userServiceClient;
    private final ListingServiceClient listingServiceClient;
    private final RatingServiceClient ratingServiceClient;

    private static final int REVIEWS_PAGE_SIZE = 6;
    private static final int LISTINGS_PAGE_SIZE = 8;

    /**
     * Aggregate user profile data from multiple services.
     * Works for both regular users and hosts.
     * If user is not a host, listings and reviews will be empty.
     */
    public Mono<HostProfileResponseDTO> getUserProfile(String userId, int reviewPage, int listingPage) {
        log.info("Fetching user profile for userId: {}, reviewPage: {}, listingPage: {}", userId, reviewPage, listingPage);

        // Fetch user profile
        Mono<PublicHostDTO> userMono = userServiceClient.getPublicProfile(userId)
                .retryWhen(Retry.backoff(3, Duration.ofMillis(100)))
                .timeout(Duration.ofSeconds(5));

        // Fetch ratings summary (optional, may be empty for non-hosts)
        Mono<RatingServiceClient.RatingSummaryDTO> ratingSummaryMono = ratingServiceClient.getHostRatingSummary(userId)
                .retryWhen(Retry.backoff(3, Duration.ofMillis(100)))
                .timeout(Duration.ofSeconds(5))
                .onErrorResume(e -> {
                    log.debug("User {} is not a host or no ratings found, using defaults", userId);
                    return Mono.just(new RatingServiceClient.RatingSummaryDTO(0.0, 0L));
                });

        // Fetch reviews (paginated, optional)
        Mono<RatingServiceClient.RatingPageResponseDTO> reviewsMono = ratingServiceClient.getReviewsByHost(userId, reviewPage, REVIEWS_PAGE_SIZE)
                .retryWhen(Retry.backoff(3, Duration.ofMillis(100)))
                .timeout(Duration.ofSeconds(5))
                .onErrorResume(e -> {
                    log.debug("No reviews found for user: {}", userId);
                    return Mono.just(new RatingServiceClient.RatingPageResponseDTO(java.util.List.of(), reviewPage, REVIEWS_PAGE_SIZE, 0L));
                });

        // Fetch listings (paginated, optional)
        Mono<ListingServiceClient.ListingPageResponseDTO> listingsMono = listingServiceClient.getListingsByHost(userId, listingPage, LISTINGS_PAGE_SIZE)
                .retryWhen(Retry.backoff(3, Duration.ofMillis(100)))
                .timeout(Duration.ofSeconds(5))
                .onErrorResume(e -> {
                    log.debug("No listings found for user: {}", userId);
                    return Mono.just(new ListingServiceClient.ListingPageResponseDTO(java.util.List.of(), listingPage, LISTINGS_PAGE_SIZE, 0L));
                });

        // Combine all
        return Mono.zip(userMono, ratingSummaryMono, reviewsMono, listingsMono)
                .map(tuple -> buildUserProfileResponse(userId, tuple.getT1(), tuple.getT2(), tuple.getT3(), tuple.getT4(), reviewPage, listingPage))
                .doOnNext(resp -> log.info("Successfully aggregated user profile for userId: {}", userId))
                .doOnError(e -> log.error("Error aggregating user profile for userId: {}", userId, e));
    }

    /**
     * Build the complete user profile response from fetched data
     */
    private HostProfileResponseDTO buildUserProfileResponse(
            String userId,
            PublicHostDTO userDto,
            RatingServiceClient.RatingSummaryDTO ratingSummary,
            RatingServiceClient.RatingPageResponseDTO reviewsPage,
            ListingServiceClient.ListingPageResponseDTO listingsPage,
            int reviewPage,
            int listingPage) {

        // Build user info (basic profile)
        HostProfileResponseDTO.HostInfoDTO hostInfo = HostProfileResponseDTO.HostInfoDTO.builder()
                .id(userId)
                .fullName(userDto.fullName())
                .avatarUrl(userDto.avatarUrl())
                .isSuperhost(userDto.superHost() != null && userDto.superHost())
                .identityVerified(true)
                .location(null)
                .hostSince(userDto.joinedAt())
                .responseRate("N/A")
                .responseTime("N/A")
                .build();

        // Build stats
        HostProfileResponseDTO.HostStatsDTO stats = HostProfileResponseDTO.HostStatsDTO.builder()
                .reviewsCount(ratingSummary.reviewCount())
                .overallRating(ratingSummary.overallRating())
                .hostingMonths(calculateMonthsSinceJoined(userDto.joinedAt()))
                .activeListingsCount(listingsPage.totalElements())
                .build();

        // Build reviews DTO
        HostProfileResponseDTO.PagedReviewsDTO reviewsDTO = HostProfileResponseDTO.PagedReviewsDTO.builder()
                .items(reviewsPage.getItems().stream()
                        .map(this::mapReviewItemDTO)
                        .collect(Collectors.toList()))
                .page(reviewPage)
                .size(REVIEWS_PAGE_SIZE)
                .totalElements(reviewsPage.totalElements())
                .build();

        // Build listings DTO
        HostProfileResponseDTO.PagedListingsDTO listingsDTO = HostProfileResponseDTO.PagedListingsDTO.builder()
                .items(listingsPage.getItems().stream()
                        .map(this::mapListingItemDTO)
                        .collect(Collectors.toList()))
                .page(listingPage)
                .size(LISTINGS_PAGE_SIZE)
                .totalElements(listingsPage.totalElements())
                .build();

        return HostProfileResponseDTO.builder()
                .hostInfo(hostInfo)
                .stats(stats)
                .reviews(reviewsDTO)
                .listings(listingsDTO)
                .build();
    }

    private HostProfileResponseDTO.ReviewItemDTO mapReviewItemDTO(RatingItemDTO ratingItem) {
        return HostProfileResponseDTO.ReviewItemDTO.builder()
                .id(ratingItem.getId())
                .listingId(ratingItem.getListingId())
                .reviewerName(ratingItem.getReviewerFullName())
                .reviewerAvatarUrl(ratingItem.getReviewerAvatarUrl())
                .reviewerLocation(ratingItem.getReviewerLocation())
                .createdAt(ratingItem.getCreatedAt() != null ? ratingItem.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toInstant() : null)
                .comment(ratingItem.getReview())
                .rating(ratingItem.getOverallRating())
                .build();
    }

    private HostProfileResponseDTO.ListingItemDTO mapListingItemDTO(ListingItemDetailDTO listingItem) {
        return HostProfileResponseDTO.ListingItemDTO.builder()
                .id(listingItem.getId())
                .title(listingItem.getTitle())
                .thumbnailUrl(listingItem.getThumbnailUrl())
                .city(listingItem.getCity())
                .shortFeatures(listingItem.getShortFeatures())
                .avgRating(listingItem.getAvgRating())
                .reviewCount(listingItem.getReviewCount())
                .build();
    }

    private long calculateMonthsSinceJoined(Instant joinedAt) {
        if (joinedAt == null) return 0;
        Instant now = Instant.now();
        long monthsDiff = java.time.temporal.ChronoUnit.MONTHS.between(joinedAt, now);
        return Math.max(monthsDiff, 0);
    }
}
