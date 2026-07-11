package com.activityservice.service;

import com.activityservice.dto.RecommendationItemResponse;
import com.activityservice.repository.UserActivityRepository;
import com.activityservice.repository.RecommendationCacheRepository;
import com.activityservice.model.UserRecommendationCache;
import java.util.ArrayList;
import java.util.Comparator;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CollaborativeFilteringService {

  private static final int DEFAULT_LIMIT = 10;
  private static final int CACHE_LIMIT = 50;
  private static final Duration CACHE_TTL = Duration.ofHours(12);

  private final UserActivityRepository userActivityRepository;
  private final RecommendationCacheRepository recommendationCacheRepository;

  public CollaborativeFilteringService(
      UserActivityRepository userActivityRepository,
      RecommendationCacheRepository recommendationCacheRepository) {
    this.userActivityRepository = userActivityRepository;
    this.recommendationCacheRepository = recommendationCacheRepository;
  }

  @Transactional
  public List<RecommendationItemResponse> recommend(String keycloakUserId, Integer limit) {
    int safeLimit = (limit == null || limit < 1) ? DEFAULT_LIMIT : Math.min(limit, 100);

    if (keycloakUserId == null || keycloakUserId.isBlank() || "__anonymous__".equals(keycloakUserId)) {
      return List.of();
    }

    List<UserRecommendationCache> cachedRecommendations = recommendationCacheRepository
        .findByKeycloakUserIdAndCalculatedAtAfterOrderByRankPositionAsc(
            keycloakUserId,
            Instant.now().minus(CACHE_TTL));

    if (!cachedRecommendations.isEmpty()) {
      return cachedRecommendations.stream()
          .limit(safeLimit)
          .map(entry -> new RecommendationItemResponse(entry.getListingId(), round(entry.getScore()), entry.getSource()))
          .toList();
    }

    int computationLimit = Math.max(safeLimit, CACHE_LIMIT);
    List<UserActivityRepository.ListingPopularityProjection> popularity = userActivityRepository.findListingPopularity();
    Map<String, Double> popularityScores = buildPopularityIndex(popularity);
    Map<String, Map<String, Double>> userItemMatrix = buildUserItemMatrix();
    Map<String, Double> targetVector = userItemMatrix.getOrDefault(keycloakUserId, Map.of());
    Set<String> seenListings = targetVector.keySet();

    if (targetVector.isEmpty()) {
      return cacheAndReturn(
          keycloakUserId,
          buildPopularityFallback(popularity, seenListings, computationLimit, "POPULARITY_COLD_START")
      ).stream().limit(safeLimit).toList();
    }

    Map<String, Double> candidateScores = new HashMap<>();

    for (Map.Entry<String, Map<String, Double>> entry : userItemMatrix.entrySet()) {
      String neighborKeycloakUserId = entry.getKey();
      if (neighborKeycloakUserId.equals(keycloakUserId)) {
        continue;
      }

      double similarity = cosineSimilarity(targetVector, entry.getValue());
      if (similarity <= 0) {
        continue;
      }

      for (Map.Entry<String, Double> neighborItem : entry.getValue().entrySet()) {
        String listingId = neighborItem.getKey();
        if (seenListings.contains(listingId)) {
          continue;
        }
        candidateScores.merge(listingId, similarity * neighborItem.getValue(), Double::sum);
      }
    }

    if (candidateScores.isEmpty()) {
      return cacheAndReturn(
          keycloakUserId,
          buildPopularityFallback(popularity, seenListings, computationLimit, "POPULARITY_SPARSE")
      ).stream().limit(safeLimit).toList();
    }

    List<RecommendationItemResponse> results = candidateScores.entrySet().stream()
        .sorted(
            Comparator.<Map.Entry<String, Double>>comparingDouble(Map.Entry::getValue).reversed()
                .thenComparing((left, right) -> Double.compare(
                    popularityScores.getOrDefault(right.getKey(), 0.0),
                    popularityScores.getOrDefault(left.getKey(), 0.0)))
                .thenComparing(Map.Entry::getKey))
        .limit(computationLimit)
        .map(entry -> new RecommendationItemResponse(entry.getKey(), round(entry.getValue()), "COLLABORATIVE_FILTERING"))
        .toList();

    if (results.size() < computationLimit) {
      Set<String> alreadyRecommended = new HashSet<>(seenListings);
      results.forEach(item -> alreadyRecommended.add(item.listingId()));
      List<RecommendationItemResponse> fallback = buildPopularityFallback(
          popularity,
          alreadyRecommended,
          computationLimit - results.size(),
          "POPULARITY_BACKFILL");
      List<RecommendationItemResponse> merged = new ArrayList<>(results);
      merged.addAll(fallback);
      return cacheAndReturn(keycloakUserId, merged).stream().limit(safeLimit).toList();
    }

    return cacheAndReturn(keycloakUserId, results).stream().limit(safeLimit).toList();
  }

  private Map<String, Map<String, Double>> buildUserItemMatrix() {
    Map<String, Map<String, Double>> matrix = new LinkedHashMap<>();
    for (UserActivityRepository.UserListingWeightProjection projection : userActivityRepository.findAllUserListingWeights()) {
      matrix
          .computeIfAbsent(projection.getKeycloakUserId(), ignored -> new HashMap<>())
          .put(projection.getListingId(), projection.getWeight());
    }
    return matrix;
  }

  private Map<String, Double> buildPopularityIndex(List<UserActivityRepository.ListingPopularityProjection> popularity) {
    Map<String, Double> popularityScores = new HashMap<>();
    for (UserActivityRepository.ListingPopularityProjection item : popularity) {
      popularityScores.put(item.getListingId(), item.getWeight());
    }
    return popularityScores;
  }

  private List<RecommendationItemResponse> buildPopularityFallback(
      List<UserActivityRepository.ListingPopularityProjection> popularity,
      Set<String> excludeListingIds,
      int limit,
      String source) {
    return popularity.stream()
        .filter(item -> !excludeListingIds.contains(item.getListingId()))
        .limit(limit)
        .map(item -> new RecommendationItemResponse(item.getListingId(), round(item.getWeight()), source))
        .toList();
  }

  private double cosineSimilarity(Map<String, Double> left, Map<String, Double> right) {
    double dotProduct = 0;
    for (Map.Entry<String, Double> entry : left.entrySet()) {
      Double rightValue = right.get(entry.getKey());
      if (rightValue != null) {
        dotProduct += entry.getValue() * rightValue;
      }
    }

    double leftMagnitude = magnitude(left);
    double rightMagnitude = magnitude(right);
    if (leftMagnitude == 0 || rightMagnitude == 0) {
      return 0;
    }
    return dotProduct / (leftMagnitude * rightMagnitude);
  }

  private double magnitude(Map<String, Double> vector) {
    double sumSquares = 0;
    for (double value : vector.values()) {
      sumSquares += value * value;
    }
    return Math.sqrt(sumSquares);
  }

  private double round(double value) {
    return Math.round(value * 1000.0) / 1000.0;
  }

  @Transactional
  protected List<RecommendationItemResponse> cacheAndReturn(
      String keycloakUserId,
      List<RecommendationItemResponse> recommendations) {
    recommendationCacheRepository.deleteByKeycloakUserId(keycloakUserId);

    Instant now = Instant.now();
    List<UserRecommendationCache> cacheEntries = recommendations.stream()
        .filter(item -> item != null && item.listingId() != null && !item.listingId().isBlank())
        .map(item -> {
          UserRecommendationCache entry = new UserRecommendationCache();
          entry.setKeycloakUserId(keycloakUserId);
          entry.setListingId(item.listingId());
          entry.setRankPosition(0);
          entry.setScore(item.score());
          entry.setSource(item.source());
          entry.setCalculatedAt(now);
          return entry;
        })
        .collect(Collectors.toList());

    for (int index = 0; index < cacheEntries.size(); index++) {
      cacheEntries.get(index).setRankPosition(index + 1);
    }

    recommendationCacheRepository.saveAll(cacheEntries);
    return recommendations;
  }
}
