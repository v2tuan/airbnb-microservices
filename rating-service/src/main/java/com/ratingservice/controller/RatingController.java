package com.ratingservice.controller;

import com.ratingservice.dto.BatchListingRatingSummaryRequest;
import com.ratingservice.dto.RatingDTO;
import com.ratingservice.service.RatingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ratings")
public class RatingController {

  @Autowired
  private RatingService ratingService;

  @PostMapping
  public ResponseEntity<RatingDTO> createRating(@RequestBody RatingDTO ratingDTO) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ratingService.createRating(ratingDTO));
  }

  @GetMapping("/{id}")
  public ResponseEntity<RatingDTO> getRating(@PathVariable String id) {
    return ResponseEntity.ok(ratingService.getRating(id));
  }

  @GetMapping("/listing/{listingId}")
  public ResponseEntity<List<RatingDTO>> getRatingsByListing(@PathVariable String listingId) {
    return ResponseEntity.ok(ratingService.getRatingsByListing(listingId));
  }

  @GetMapping("/listing/{listingId}/average")
  public ResponseEntity<Double> getAverageRating(@PathVariable String listingId) {
    return ResponseEntity.ok(ratingService.getAverageRating(listingId));
  }

  @GetMapping("/listing/{listingId}/summary")
  public ResponseEntity<Map<String, Object>> getListingRatingSummary(@PathVariable String listingId) {
    return ResponseEntity.ok(ratingService.getListingRatingSummary(listingId));
  }

  @PostMapping("/listings/summary")
  public ResponseEntity<Map<String, Map<String, Object>>> getListingRatingSummaries(
      @RequestBody BatchListingRatingSummaryRequest request) {
    return ResponseEntity.ok(ratingService.getListingRatingSummaries(request.listingIds()));
  }

  @PutMapping("/{id}")
  public ResponseEntity<RatingDTO> updateRating(
      @PathVariable String id,
      @RequestBody RatingDTO ratingDTO) {
    return ResponseEntity.ok(ratingService.updateRating(id, ratingDTO));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteRating(@PathVariable String id) {
    ratingService.deleteRating(id);
    return ResponseEntity.noContent().build();
  }

  /**
   * Get paginated reviews for a host
   */
  @GetMapping("/host/{hostId}")
  public ResponseEntity<Page<RatingDTO>> getReviewsByHost(
      @PathVariable String hostId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "createdAt") String sort,
      @RequestParam(defaultValue = "DESC") String direction) {

    Sort.Direction sortDirection = Sort.Direction.fromString(direction);
    Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sort));

    return ResponseEntity.ok(ratingService.getReviewsByHost(hostId, pageable));
  }

  /**
   * Get rating summary for a host
   */
  @GetMapping("/summary/host/{hostId}")
  public ResponseEntity<Map<String, Object>> getHostRatingSummary(@PathVariable String hostId) {
    return ResponseEntity.ok(ratingService.getHostRatingSummary(hostId));
  }
}

