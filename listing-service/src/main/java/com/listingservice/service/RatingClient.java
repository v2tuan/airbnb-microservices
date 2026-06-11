package com.listingservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class RatingClient {

  private final RestClient ratingServiceClient;

  public RatingClient(@Value("${clients.rating-service.base-url:http://localhost:8888}") String ratingServiceBaseUrl) {
    this.ratingServiceClient = RestClient.builder()
        .baseUrl(ratingServiceBaseUrl)
        .requestFactory(requestFactory())
        .build();
  }

  public BigDecimal getAverageRating(UUID listingId) {
    if (listingId == null) {
      return BigDecimal.ZERO;
    }

    try {
      Double average = ratingServiceClient.get()
          .uri("/api/v1/ratings/listing/{listingId}/average", listingId)
          .retrieve()
          .body(Double.class);

      if (average == null) {
        return BigDecimal.ZERO;
      }

      return BigDecimal.valueOf(average).setScale(2, RoundingMode.HALF_UP);
    } catch (Exception ex) {
      log.warn("Failed to fetch average rating for listingId={}. Fallback to 0.", listingId, ex);
      return BigDecimal.ZERO;
    }
  }

  public ListingRatingSummary getListingRatingSummary(UUID listingId) {
    if (listingId == null) {
      return new ListingRatingSummary(BigDecimal.ZERO, 0L);
    }

    try {
      ListingRatingSummary summary = ratingServiceClient.get()
          .uri("/api/v1/ratings/listing/{listingId}/summary", listingId)
          .retrieve()
          .body(ListingRatingSummary.class);

      if (summary == null) {
        return new ListingRatingSummary(BigDecimal.ZERO, 0L);
      }

      BigDecimal average = summary.getOverallRating() == null
          ? BigDecimal.ZERO
          : summary.getOverallRating().setScale(2, RoundingMode.HALF_UP);
      Long reviewCount = summary.getReviewCount() == null ? 0L : summary.getReviewCount();
      return new ListingRatingSummary(average, reviewCount);
    } catch (Exception ex) {
      log.warn("Failed to fetch rating summary for listingId={}. Fallback to defaults.", listingId, ex);
      return new ListingRatingSummary(BigDecimal.ZERO, 0L);
    }
  }

  public Map<String, ListingRatingSummary> getListingRatingSummaries(List<UUID> listingIds) {
    if (listingIds == null || listingIds.isEmpty()) {
      return Map.of();
    }

    try {
      List<String> ids = listingIds.stream()
          .filter(java.util.Objects::nonNull)
          .map(UUID::toString)
          .distinct()
          .toList();

      if (ids.isEmpty()) {
        return Map.of();
      }

      Map<String, ListingRatingSummary> summaries = ratingServiceClient.post()
          .uri("/api/v1/ratings/listings/summary")
          .body(new BatchListingRatingSummaryRequest(ids))
          .retrieve()
          .body(new ParameterizedTypeReference<Map<String, ListingRatingSummary>>() {});
      return summaries != null ? summaries : Map.of();
    } catch (Exception ex) {
      log.warn("Failed to fetch batch rating summaries. Fallback to defaults.", ex);
      return Map.of();
    }
  }

  private SimpleClientHttpRequestFactory requestFactory() {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofMillis(1000));
    factory.setReadTimeout(Duration.ofMillis(1500));
    return factory;
  }

  private record BatchListingRatingSummaryRequest(List<String> listingIds) {
  }

  public static class ListingRatingSummary {
    private BigDecimal overallRating;
    private Long reviewCount;

    public ListingRatingSummary() {
    }

    public ListingRatingSummary(BigDecimal overallRating, Long reviewCount) {
      this.overallRating = overallRating;
      this.reviewCount = reviewCount;
    }

    public BigDecimal getOverallRating() {
      return overallRating;
    }

    public void setOverallRating(BigDecimal overallRating) {
      this.overallRating = overallRating;
    }

    public Long getReviewCount() {
      return reviewCount;
    }

    public void setReviewCount(Long reviewCount) {
      this.reviewCount = reviewCount;
    }
  }
}
