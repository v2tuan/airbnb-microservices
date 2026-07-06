package com.ratingservice.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record BookingReviewContextDTO(
    String bookingId,
    String listingId,
    String guestId,
    String hostId,
    String status,
    LocalDate checkInDate,
    LocalDate checkOutDate,
    LocalDateTime completedAt,
    boolean canReview
) {
}
