package com.activityservice.service;

import com.activityservice.dto.RecommendationItemResponse;
import com.activityservice.repository.UserActivityRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class CollaborativeFilteringService {

  private static final int DEFAULT_LIMIT = 10;

  private final UserActivityRepository userActivityRepository;

  public CollaborativeFilteringService(UserActivityRepository userActivityRepository) {
    this.userActivityRepository = userActivityRepository;
  }

  public List<RecommendationItemResponse> recommend(String userId, Integer limit) {
    int safeLimit = (limit == null || limit < 1) ? DEFAULT_LIMIT : Math.min(limit, 100);

    List<UserActivityRepository.ListingPopularityProjection> popularity = userActivityRepository.findListingPopularity();
    Map<String, Double> popularityScores = buildPopularityIndex(popularity);
    Map<String, Map<String, Double>> userItemMatrix = buildUserItemMatrix();
    Map<String, Double> targetVector = userItemMatrix.getOrDefault(userId, Map.of());
    Set<String> seenListings = targetVector.keySet();

    if (targetVector.isEmpty()) {
      return buildPopularityFallback(popularity, seenListings, safeLimit, "POPULARITY_COLD_START");
    }

    Map<String, Double> candidateScores = new HashMap<>();

    for (Map.Entry<String, Map<String, Double>> entry : userItemMatrix.entrySet()) {
      String neighborUserId = entry.getKey();
      if (neighborUserId.equals(userId)) {
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
      return buildPopularityFallback(popularity, seenListings, safeLimit, "POPULARITY_SPARSE");
    }

    List<RecommendationItemResponse> results = candidateScores.entrySet().stream()
        .sorted(
            Comparator.<Map.Entry<String, Double>>comparingDouble(Map.Entry::getValue).reversed()
                .thenComparing((left, right) -> Double.compare(
                    popularityScores.getOrDefault(right.getKey(), 0.0),
                    popularityScores.getOrDefault(left.getKey(), 0.0)))
                .thenComparing(Map.Entry::getKey))
        .limit(safeLimit)
        .map(entry -> new RecommendationItemResponse(entry.getKey(), round(entry.getValue()), "COLLABORATIVE_FILTERING"))
        .toList();

    if (results.size() < safeLimit) {
      Set<String> alreadyRecommended = new HashSet<>(seenListings);
      results.forEach(item -> alreadyRecommended.add(item.listingId()));
      List<RecommendationItemResponse> fallback = buildPopularityFallback(
          popularity,
          alreadyRecommended,
          safeLimit - results.size(),
          "POPULARITY_BACKFILL");
      List<RecommendationItemResponse> merged = new ArrayList<>(results);
      merged.addAll(fallback);
      return merged;
    }

    return results;
  }

  private Map<String, Map<String, Double>> buildUserItemMatrix() {
    Map<String, Map<String, Double>> matrix = new LinkedHashMap<>();
    for (UserActivityRepository.UserListingWeightProjection projection : userActivityRepository.findAllUserListingWeights()) {
      matrix
          .computeIfAbsent(projection.getUserId(), ignored -> new HashMap<>())
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
}
