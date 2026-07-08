package com.bookingservice.dto.response;

import com.bookingservice.entity.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO cho reservation card trên host dashboard.
 *
 * Nguồn dữ liệu chính là Booking; service enrich thêm guest/listing summary để frontend
 * có thể render list, filter, stats và calendar mà không cần gọi detail cho từng booking.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationResponse {
    private UUID reservationId;
    private String reservationCode;
    private UUID listingId;
    private UUID hostId;
    private UUID guestId;
    private GuestSummary guest;
    private String listingTitle;
    private String listingCity;
    private String listingCountry;
    private String listingCoverImageUrl;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private LocalDateTime scheduledCheckInAt;
    private LocalDateTime scheduledCheckOutAt;
    private Integer totalNights;
    private long totalAmount;
    private String currency;
    private BookingStatus status;
    private String statusDisplayName;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime paidAt;
    private LocalDateTime checkedInAt;
    private LocalDateTime checkedOutAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    private Integer numAdults;
    private Integer numChildren;
    private Integer numInfants;
    private Integer numPets;
    private String guestNotes;

    /**
     * Thông tin guest rút gọn.
     * Nếu User Service không trả profile, service sẽ fallback fullName = "Guest"
     * để dashboard vẫn usable thay vì fail toàn bộ danh sách.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GuestSummary {
        private UUID userId;
        private String keycloakUserId;
        private String fullName;
        private String avatarUrl;
    }
}
