package com.bookingservice.dto.response;

import com.bookingservice.entity.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReservationDetailResponse {
    private UUID bookingId;
    private String reservationCode;
    private BookingStatus status;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime checkedInAt;
    private LocalDateTime checkedOutAt;
    private LocalDateTime completedAt;
    private long totalAmount;
    private String currency;
    private PartySummary guest;
    private PartySummary host;
    private ListingSummary listing;
    private PaymentSummary payment;
    private List<RefundSummary> refunds;
    private List<TimelineItem> timeline;
    private UUID complaintId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PartySummary {
        private UUID id;
        private String name;
        private String email;
        private String phone;
        private String avatarUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListingSummary {
        private UUID id;
        private String title;
        private String city;
        private String country;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentSummary {
        private UUID paymentId;
        private String paymentIntentId;
        private String status;
        private BigDecimal amount;
        private String currency;
        private LocalDateTime paidAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RefundSummary {
        private UUID refundId;
        private String status;
        private BigDecimal amount;
        private String currency;
        private String businessCause;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimelineItem {
        private String key;
        private String label;
        private String description;
        private LocalDateTime occurredAt;
    }
}
