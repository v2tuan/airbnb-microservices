package com.bookingservice.dto.response;

import com.bookingservice.constant.PropertyType;
import com.bookingservice.constant.RoomType;
import com.bookingservice.entity.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO cho trang detail reservation của host/admin.
 *
 * Đây là view model đã được backend tổng hợp từ Booking + Listing Service + User Service.
 * Frontend nhận một response duy nhất để render guest info, listing info, pricing và status timeline.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationDetailResponse {
    private UUID reservationId;
    private String reservationCode;
    private UUID listingId;
    private UUID hostId;
    private UUID guestId;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer totalNights;
    private BookingStatus status;
    private String statusDisplayName;
    private String currency;
    private long totalAmount;
    private String paymentIntentId;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime paidAt;
    private LocalDateTime checkedInAt;
    private LocalDateTime checkedOutAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    private String cancellationReason;
    private Integer numAdults;
    private Integer numChildren;
    private Integer numInfants;
    private Integer numPets;
    private String guestNotes;
    private ListingSummary listing;
    private ReservationResponse.GuestSummary guest;
    private PaymentSummary payment;

    /**
     * Snapshot thông tin listing tại thời điểm render detail.
     * Chỉ chứa các field cần cho host xem bối cảnh lưu trú, không expose toàn bộ aggregate của Listing Service.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListingSummary {
        private UUID listingId;
        private String title;
        private String description;
        private PropertyType propertyType;
        private RoomType roomType;
        private String address;
        private String city;
        private String state;
        private String country;
        private String postalCode;
        private BigDecimal latitude;
        private BigDecimal longitude;
        private Integer maxGuests;
        private Integer numBedrooms;
        private Integer numBeds;
        private BigDecimal numBathrooms;
        private LocalTime checkInStartTime;
        private LocalTime checkInEndTime;
        private LocalTime checkOutTime;
        private List<ListingPhotoResponse> photos;
        private List<AmenityResponse> amenities;
        private HouseRulesResponse houseRules;
    }

    /**
     * Tóm tắt thanh toán phục vụ pricing section.
     * Các số tiền được tính từ Booking hiện tại để UI không phải tự suy luận từ totalAmount.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentSummary {
        private BigDecimal totalAmount;
        private BigDecimal accommodationAmount;
        private BigDecimal cleaningFee;
        private BigDecimal serviceFee;
        private BigDecimal taxes;
        private String currency;
        private String stripePaymentIntentId;
        private String stripePaymentStatus;
    }
}
