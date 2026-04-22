package com.apigateway.client;

import com.apigateway.dto.response.RatingItemDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
@Slf4j
public class RatingServiceClient {

    private final WebClient ratingServiceWebClient;

    public RatingServiceClient(@Qualifier("ratingServiceWebClient") WebClient ratingServiceWebClient) {
        this.ratingServiceWebClient = ratingServiceWebClient;
    }

    /**
     * Get paginated reviews by host ID
     */
    public Mono<RatingPageResponseDTO> getReviewsByHost(String hostId, int page, int size) {
        return ratingServiceWebClient
                .get()
                .uri(uriBuilder -> uriBuilder
                        .path("/ratings/host/{hostId}")
                        .queryParam("page", page)
                        .queryParam("size", size)
                        .queryParam("sort", "createdAt")
                        .queryParam("direction", "DESC")
                        .build(hostId))
                .retrieve()
                .bodyToMono(RatingPageResponseDTO.class)
                .doOnNext(resp -> log.debug("Fetched {} reviews for host: {}", resp.content().size(), hostId))
                .doOnError(e -> log.error("Error fetching reviews for host: {}", hostId, e));
    }

    /**
     * Get rating summary for host (count, overall rating, etc.)
     */
    public Mono<RatingSummaryDTO> getHostRatingSummary(String hostId) {
        return ratingServiceWebClient
                .get()
                .uri("/ratings/summary/host/{hostId}", hostId)
                .retrieve()
                .bodyToMono(RatingSummaryDTO.class)
                .doOnNext(summary -> log.debug("Fetched rating summary for host: {}", hostId))
                .doOnError(e -> log.error("Error fetching rating summary for host: {}", hostId, e));
    }

    // ============ NESTED DTOs ============

    public record RatingPageResponseDTO(
            List<RatingItemDTO> content,
            Integer number,
            Integer size,
            Long totalElements) {

        public List<RatingItemDTO> getItems() {
            return content;
        }
    }

    public record RatingSummaryDTO(
            Double overallRating,
            Long reviewCount) {
    }
}
