package com.listingservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Component
@Slf4j
public class RatingClient {

  @Value("${clients.rating-service.base-url:http://localhost:8888}")
  private String ratingServiceBaseUrl;

  public BigDecimal getAverageRating(UUID listingId) {
    if (listingId == null) {
      return BigDecimal.ZERO;
    }

    try {
      Double average = RestClient.builder()
          .baseUrl(ratingServiceBaseUrl)
          .build()
          .get()
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
      ListingRatingSummary summary = RestClient.builder()
          .baseUrl(ratingServiceBaseUrl)
          .build()
          .get()
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
