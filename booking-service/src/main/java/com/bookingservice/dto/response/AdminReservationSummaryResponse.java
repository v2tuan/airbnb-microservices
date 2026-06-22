package com.bookingservice.dto.response;

import com.bookingservice.entity.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReservationSummaryResponse {
    private UUID bookingId;
    private String reservationCode;
    private UUID listingId;
    private String listingTitle;
    private UUID guestId;
    private String guestName;
    private UUID hostId;
    private String hostName;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private BookingStatus status;
    private String paymentStatus;
    private long totalAmount;
    private String currency;
    private LocalDateTime createdAt;
    private List<String> riskFlags;
}
