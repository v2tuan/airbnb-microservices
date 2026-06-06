package com.ratingservice.repository;

import com.ratingservice.entity.Rating;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RatingRepository extends JpaRepository<Rating, String> {
  interface ListingRatingSummaryProjection {
    String getListingId();

    Long getReviewCount();

    Double getAvgRating();
  }

  List<Rating> findByListingId(String listingId);

  /**
   * Get paginated reviews for a host
   */
  Page<Rating> findByHostId(String hostId, Pageable pageable);

  /**
   * Get rating summary for a host
   */
  @Query("SELECT COUNT(r) as reviewCount, AVG(r.overallRating) as avgRating FROM Rating r WHERE r.hostId = :hostId")
  Object[] getHostRatingSummary(@Param("hostId") String hostId);

  /**
   * Get rating summary for a listing
   */
  @Query("SELECT COUNT(r) as reviewCount, AVG(r.overallRating) as avgRating FROM Rating r WHERE r.listingId = :listingId")
  Object[] getListingRatingSummary(@Param("listingId") String listingId);

  @Query("""
      SELECT r.listingId as listingId, COUNT(r) as reviewCount, AVG(r.overallRating) as avgRating
      FROM Rating r
      WHERE r.listingId IN :listingIds
      GROUP BY r.listingId
      """)
  List<ListingRatingSummaryProjection> getListingRatingSummaries(@Param("listingIds") List<String> listingIds);
}
