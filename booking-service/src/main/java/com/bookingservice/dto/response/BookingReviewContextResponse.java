package com.bookingservice.dto.response;

import com.bookingservice.entity.BookingStatus;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record BookingReviewContextResponse(
        UUID bookingId,
        UUID listingId,
        UUID guestId,
        UUID hostId,
        BookingStatus status,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        LocalDateTime scheduledCheckInAt,
        LocalDateTime scheduledCheckOutAt,
        LocalDateTime completedAt,
        boolean canReview
) {
}
