package com.bookingservice.dto.response;

import com.bookingservice.entity.BookingStatus;
import jakarta.persistence.Column;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class BookingTripResponse {

    // ===== Booking info =====
    private UUID bookingId;
    private UUID listingId;
    private UUID hostId;

    private LocalDate checkInDate;
    private LocalDate checkOutDate;

    private Integer totalNights;
    private Long totalAmount;
    private String currency;

    private BookingStatus status;
    private String statusDisplayName;

    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime paidAt;
    private LocalDateTime checkedOutAt;

//    private Long secondsUntilExpiry;

    private Integer numAdults;
    private Integer numChildren;
    private Integer numInfants;
    private Integer numPets;

    // ===== Listing snapshot (VERY IMPORTANT for UI) =====
    private String title;
    private String city;
    private String country;
    private String coverImageUrl;
    private Long basePrice;

    // ===== UI helper =====
    private String tripLabel; // "Upcoming trip", "Past trip"
}
