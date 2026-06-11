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

    Map<String, Object> reviewsPagePayload = fetchReviewsPage(hostId, reviewPage, Map.of());
    Map<String, Object> listingsPagePayload = fetchListingsPage(hostId, listingPage);

    Map<String, Object> ratingSummary = fetchRatingSummary(hostId);
    long reviewsCount = toLong(ratingSummary.get("reviewCount"));
    double overallRating = toDouble(ratingSummary.get("overallRating"));
    long activeListingsCount = toLong(listingsPagePayload.getOrDefault("totalElements", 0L));

    if (reviewsCount == 0L) {
      reviewsCount = toLong(reviewsPagePayload.getOrDefault("totalElements", 0L));
    }

    Map<String, Object> statsPayload = new LinkedHashMap<>();
    statsPayload.put("reviewsCount", reviewsCount);
    statsPayload.put("overallRating", overallRating);
    statsPayload.put("hostingMonths", calculateMonthsSinceJoined(host.joinedAt()));
    statsPayload.put("activeListingsCount", activeListingsCount);

    Map<String, Object> reviewsPayload = new LinkedHashMap<>();
    reviewsPayload.put("items", reviewsPagePayload.getOrDefault("items", List.of()));
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
      int reviewPage,
      Map<String, Map<String, Object>> allListingsById) {
    try {
      Map<String, Object> response = ratingServiceClient.getReviewsByHost(
          hostId, reviewPage, REVIEWS_PAGE_SIZE, "createdAt", "DESC");

      if (response == null) {
        return new LinkedHashMap<>();
      }

      List<Map<String, Object>> items = new ArrayList<>();
      Object content = response.get("content");
      if (content instanceof List<?> contentList) {
        for (Object item : contentList) {
          if (item instanceof Map<?, ?> itemMap) {
            Map<String, Object> review = new LinkedHashMap<>();
            review.put("id", itemMap.get("id"));
            String listingId = itemMap.get("listingId") == null ? null : itemMap.get("listingId").toString();
            review.put("listingId", listingId);
            review.put("reviewerName", itemMap.get("reviewerFullName"));
            review.put("reviewerAvatarUrl", itemMap.get("reviewerAvatarUrl"));
            review.put("reviewerLocation", itemMap.get("reviewerLocation"));
            review.put("createdAt", itemMap.get("createdAt"));
            review.put("comment", itemMap.get("review"));
            review.put("rating", itemMap.get("overallRating"));
            review.put("listingTitle", lookupListingTitle(allListingsById, listingId));
            items.add(review);
          }
        }
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

  private String lookupListingTitle(Map<String, Map<String, Object>> allListingsById, String listingId) {
    if (listingId == null || listingId.isBlank()) {
      return null;
    }

    try {
      Map<String, Object> listing = allListingsById.get(listingId);
      if (listing != null) {
        Object title = listing.get("title");
        return title == null ? null : title.toString();
      }
    } catch (Exception ex) {
      return null;
    }

    return null;
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
}
