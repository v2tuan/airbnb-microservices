package com.bookingservice.dto.response;

import com.bookingservice.entity.BookingStatus;
import com.bookingservice.constant.PropertyType;
import com.bookingservice.constant.RoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingDetailResponse {
    private UUID bookingId;
    private String reservationCode;
    private UUID listingId;
    private UUID guestId;
    private UUID hostId;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer totalNights;
    private BookingStatus status;
    private String statusDisplayName;
    private String currency;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime paidAt;
    private LocalDateTime checkedInAt;
    private LocalDateTime completedAt;
    private String paymentIntentId;
    private Integer numAdults;
    private Integer numChildren;
    private Integer numInfants;
    private Integer numPets;
    private String guestNotes;
    private ListingStaySummary listing;
    private HostSummary host;
    private AccessInfo accessInfo;
    private PaymentSummary payment;
    private CancellationPolicy cancellationPolicy;
    private ReviewSummary reviewSummary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListingStaySummary {
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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HostSummary {
        private String keycloakUserId;
        private UUID userId;
        private String fullName;
        private String avatarUrl;
        private Boolean superHost;
        private Instant joinedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AccessInfo {
        private String wifiPassword;
        private String entryCode;
        private String smartLockInstructions;
        private String keyPickupInstructions;
        private List<GuideStep> checkInGuide;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GuideStep {
        private Integer stepNumber;
        private String title;
        private String description;
        private String imageUrl;
    }

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
        private String refundPolicy;
        private String stripePaymentIntentId;
        private String stripePaymentStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CancellationPolicy {
        private String type;
        private String description;
        private Boolean refundable;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewSummary {
        private BigDecimal averageRating;
        private Integer reviewCount;
    }
}
