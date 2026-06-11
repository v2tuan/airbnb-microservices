package com.listingservice.service;

import com.listingservice.dto.request.BatchListingRatingSummaryRequest;
import com.listingservice.repository.client.RatingServiceFeignClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class RatingClient {

  private final RatingServiceFeignClient ratingServiceFeignClient;

  public BigDecimal getAverageRating(UUID listingId) {
    if (listingId == null) {
      return BigDecimal.ZERO;
    }

    try {
      Double average = ratingServiceFeignClient.getAverageRating(listingId);
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
      Map<String, Object> summary = ratingServiceFeignClient.getListingRatingSummary(listingId);
      return toListingRatingSummary(summary);
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

      Map<String, Map<String, Object>> summaries = ratingServiceFeignClient.getListingRatingSummaries(
          new BatchListingRatingSummaryRequest(ids));

      if (summaries == null || summaries.isEmpty()) {
        return Map.of();
      }

      Map<String, ListingRatingSummary> result = new java.util.LinkedHashMap<>();
      summaries.forEach((listingId, summary) ->
          result.put(listingId, toListingRatingSummary(summary)));
      return result;
    } catch (Exception ex) {
      log.warn("Failed to fetch batch rating summaries. Fallback to defaults.", ex);
      return Map.of();
    }
  }

  private ListingRatingSummary toListingRatingSummary(Map<String, Object> summary) {
    if (summary == null || summary.isEmpty()) {
      return new ListingRatingSummary(BigDecimal.ZERO, 0L);
    }

    BigDecimal average = BigDecimal.ZERO;
    Object overallRating = summary.get("overallRating");
    if (overallRating instanceof Number number) {
      average = BigDecimal.valueOf(number.doubleValue()).setScale(2, RoundingMode.HALF_UP);
    }

    long reviewCount = 0L;
    Object count = summary.get("reviewCount");
    if (count instanceof Number number) {
      reviewCount = number.longValue();
    }

    return new ListingRatingSummary(average, reviewCount);
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
