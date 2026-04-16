package com.ratingservice.controller;

import com.ratingservice.dto.RatingDTO;
import com.ratingservice.service.RatingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ratings")
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
}
