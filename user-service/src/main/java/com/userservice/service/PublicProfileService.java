package com.userservice.service;

import com.userservice.dto.response.PublicHostResponseDTO;
import com.userservice.entity.User;
import com.userservice.repository.ListingServiceClient;
import com.userservice.repository.RatingServiceClient;
import com.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PublicProfileService {

  private final UserRepository userRepository;
  private final ListingServiceClient listingServiceClient;
  private final RatingServiceClient ratingServiceClient;

  private static final int REVIEWS_PAGE_SIZE = 6;
  private static final int LISTINGS_PAGE_SIZE = 8;

  public Optional<PublicHostResponseDTO> getByKeycloakUserId(String keycloakUserId) {
    return userRepository.findByKeycloakUserId(keycloakUserId).map(this::toPublicResponse);
  }

  public List<PublicHostResponseDTO> getByKeycloakUserIds(List<String> keycloadUserIds) {
    return userRepository.findByKeycloakUserIdIn(keycloadUserIds).stream().map(this::toPublicResponse).toList();
  }

  public Optional<PublicHostResponseDTO> getByUserId(UUID userId) {
    return userRepository.findById(userId).map(this::toPublicResponse);
  }

  public Optional<PublicHostResponseDTO> getByAnyId(String id) {
    try {
      UUID userId = UUID.fromString(id);
      return getByUserId(userId)
          .or(() -> getByKeycloakUserId(id));
    } catch (IllegalArgumentException ex) {
      return getByKeycloakUserId(id);
    }
  }

  public Optional<Map<String, Object>> getProfilePayload(String id, int reviewPage, int listingPage) {
    return getByAnyId(id).map(host -> toProfilePayload(host, reviewPage, listingPage));
  }

  private PublicHostResponseDTO toPublicResponse(User u) {
    return new PublicHostResponseDTO(
        u.getUserId(),
        u.getKeycloakUserId(),
        u.getFullName(),
        u.getAvatarUrl(),
        u.getHostProfile() != null ? u.getHostProfile().getIsSuperhost() : false,
        u.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant()
    );
  }

  private Map<String, Object> toProfilePayload(PublicHostResponseDTO host, int reviewPage, int listingPage) {
    String hostId = resolveHostId(host);

    Map<String, Object> hostPayload = new LinkedHashMap<>();
    hostPayload.put("id", hostId);
    hostPayload.put("fullName", host.fullName());
    hostPayload.put("avatarUrl", host.avatarUrl() == null ? "" : host.avatarUrl());
    hostPayload.put("isSuperhost", host.superHost() != null && host.superHost());
    hostPayload.put("identityVerified", true);
    hostPayload.put("location", "");
    hostPayload.put("hostSince", host.joinedAt() == null ? "" : host.joinedAt().toString());
    hostPayload.put("responseRate", "N/A");
    hostPayload.put("responseTime", "N/A");

    Map<String, Object> reviewsPagePayload = fetchReviewsPage(hostId, reviewPage);
    Map<String, Object> listingsPagePayload = fetchListingsPage(hostId, listingPage);

    Map<String, Object> ratingSummary = fetchRatingSummary(hostId);
    long reviewsCount = toLong(ratingSummary.get("reviewCount"));
    double overallRating = toDouble(ratingSummary.get("overallRating"));

    List<Map<String, Object>> reviewItems = extractItems(reviewsPagePayload.get("items"));
    if (reviewsCount == 0L) {
      reviewsCount = toLong(reviewsPagePayload.getOrDefault("totalElements", 0L));
    }
    if (overallRating <= 0.0) {
      overallRating = computeAverageRating(reviewItems);
    }

    long activeListingsCount = toLong(listingsPagePayload.getOrDefault("totalElements", 0L));

    Map<String, Object> statsPayload = new LinkedHashMap<>();
    statsPayload.put("reviewsCount", reviewsCount);
    statsPayload.put("overallRating", overallRating);
    statsPayload.put("hostingMonths", calculateMonthsSinceJoined(host.joinedAt()));
    statsPayload.put("activeListingsCount", activeListingsCount);

    Map<String, Object> reviewsPayload = new LinkedHashMap<>();
    reviewsPayload.put("items", reviewItems);
    reviewsPayload.put("page", reviewPage);
    reviewsPayload.put("size", REVIEWS_PAGE_SIZE);
    reviewsPayload.put("totalElements", reviewsPagePayload.getOrDefault("totalElements", 0L));

    Map<String, Object> listingsPayload = new LinkedHashMap<>();
    listingsPayload.put("items", listingsPagePayload.getOrDefault("items", List.of()));
    listingsPayload.put("page", listingPage);
    listingsPayload.put("size", LISTINGS_PAGE_SIZE);
    listingsPayload.put("totalElements", listingsPagePayload.getOrDefault("totalElements", 0L));

    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("host", hostPayload);
    payload.put("stats", statsPayload);
    payload.put("reviews", reviewsPayload);
    payload.put("listings", listingsPayload);
    return payload;
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> fetchReviewsPage(
      String hostId,
      int reviewPage) {
    try {
      Map<String, Object> response = ratingServiceClient.getReviewsByHost(
          hostId, reviewPage, REVIEWS_PAGE_SIZE, "createdAt", "DESC");

      if (response == null) {
        return new LinkedHashMap<>();
      }

      List<Map<String, Object>> items = new ArrayList<>();
      Object content = response.get("content");
      if (content instanceof List<?> contentList) {
        List<String> listingIds = new ArrayList<>();
        for (Object item : contentList) {
          if (item instanceof Map<?, ?> itemMap) {
            Map<String, Object> review = new LinkedHashMap<>();
            review.put("id", itemMap.get("id"));
            String listingId = itemMap.get("listingId") == null ? null : itemMap.get("listingId").toString();
            review.put("listingId", listingId);
            if (listingId != null && !listingId.isBlank()) {
              listingIds.add(listingId);
            }
            review.put("reviewerName", itemMap.get("reviewerFullName"));
            review.put("reviewerAvatarUrl", itemMap.get("reviewerAvatarUrl"));
            review.put("reviewerLocation", itemMap.get("reviewerLocation"));
            review.put("createdAt", itemMap.get("createdAt"));
            review.put("comment", itemMap.get("review"));
            review.put("rating", itemMap.get("overallRating"));
            items.add(review);
          }
        }
        Map<String, String> listingTitles = fetchListingTitles(hostId, listingIds);
        items.forEach(review ->
            review.put("listingTitle", listingTitles.getOrDefault(
                stringValue(review.get("listingId")),
                null
            ))
        );
      }

      Map<String, Object> normalized = new LinkedHashMap<>();
      normalized.put("items", items);
      normalized.put("page", response.getOrDefault("number", reviewPage));
      normalized.put("size", response.getOrDefault("size", REVIEWS_PAGE_SIZE));
      normalized.put("totalElements", response.getOrDefault("totalElements", 0L));
      return normalized;
    } catch (Exception ex) {
      return new LinkedHashMap<>();
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> fetchListingsPage(String hostId, int listingPage) {
    try {
      Map<String, Object> response = listingServiceClient.getListingsByHostPaginated(
          hostId, listingPage, LISTINGS_PAGE_SIZE, "ACTIVE", "createdAt", "DESC");

      if (response == null) {
        return new LinkedHashMap<>();
      }

      Map<String, Object> normalized = new LinkedHashMap<>();
      normalized.put("items", response.getOrDefault("content", List.of()));
      normalized.put("page", response.getOrDefault("number", listingPage));
      normalized.put("size", response.getOrDefault("size", LISTINGS_PAGE_SIZE));
      normalized.put("totalElements", response.getOrDefault("totalElements", 0L));
      return normalized;
    } catch (Exception ex) {
      return new LinkedHashMap<>();
    }
  }

  private Map<String, Object> fetchRatingSummary(String hostId) {
    try {
      Map<String, Object> response = ratingServiceClient.getHostRatingSummary(hostId);
      return response == null ? new LinkedHashMap<>() : response;
    } catch (Exception ex) {
      return new LinkedHashMap<>();
    }
  }

  private Map<String, String> fetchListingTitles(String hostId, Collection<String> listingIds) {
    Map<String, String> result = new LinkedHashMap<>();
    if (listingIds == null || listingIds.isEmpty()) {
      return result;
    }

    List<UUID> ids = listingIds.stream()
        .filter(id -> id != null && !id.isBlank())
        .map(id -> {
          try {
            return UUID.fromString(id);
          } catch (IllegalArgumentException ex) {
            return null;
          }
        })
        .filter(java.util.Objects::nonNull)
        .distinct()
        .toList();

    if (ids.isEmpty()) {
      return result;
    }

    try {
      Map<String, Object> response = listingServiceClient.getListingsByHost(hostId);
      List<Map<String, Object>> items = extractItems(response.getOrDefault("data", response.get("content")));
      for (Map<String, Object> item : items) {
        String listingId = stringValue(
            item.get("id") != null ? item.get("id") : item.get("listingId")
        );
        String title = stringValue(item.get("title"));
        if (listingId != null && title != null) {
          result.put(listingId, title);
        }
      }
    } catch (Exception ex) {
      // keep null title fallback
    }

    return result;
  }

  private List<Map<String, Object>> extractItems(Object value) {
    if (value instanceof List<?> items) {
      List<Map<String, Object>> result = new ArrayList<>();
      for (Object item : items) {
        if (item instanceof Map<?, ?> map) {
          Map<String, Object> normalized = new LinkedHashMap<>();
          map.forEach((key, entryValue) -> normalized.put(String.valueOf(key), entryValue));
          result.add(normalized);
        }
      }
      return result;
    }
    return new ArrayList<>();
  }

  private double computeAverageRating(List<Map<String, Object>> reviewItems) {
    if (reviewItems == null || reviewItems.isEmpty()) {
      return 0.0;
    }

    double sum = 0.0;
    long count = 0L;
    for (Map<String, Object> review : reviewItems) {
      double rating = toDouble(review.get("rating"));
      if (rating > 0) {
        sum += rating;
        count++;
      }
    }

    return count > 0 ? sum / count : 0.0;
  }

  private String resolveHostId(PublicHostResponseDTO host) {
    if (host.keycloakUserId() != null && !host.keycloakUserId().isBlank()) {
      return host.keycloakUserId();
    }

    return host.userId() != null ? host.userId().toString() : "";
  }

  private long calculateMonthsSinceJoined(Instant joinedAt) {
    if (joinedAt == null) {
      return 0;
    }

    ZoneId zone = ZoneId.systemDefault();
    LocalDate joinedDate = joinedAt.atZone(zone).toLocalDate();
    LocalDate currentDate = LocalDate.now(zone);

    return Math.max(ChronoUnit.MONTHS.between(joinedDate, currentDate), 0);
  }

  private long toLong(Object value) {
    if (value instanceof Number number) {
      return number.longValue();
    }
    return 0L;
  }

  private double toDouble(Object value) {
    if (value instanceof Number number) {
      return number.doubleValue();
    }
    return 0.0;
  }

  private String stringValue(Object value) {
    return value == null ? null : String.valueOf(value);
  }
}
