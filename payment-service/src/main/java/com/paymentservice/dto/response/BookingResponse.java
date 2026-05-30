package com.paymentservice.dto.response;

import com.paymentservice.dto.request.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponse {
    private UUID id;
    private UUID roomId;
    private UUID userId;
    private UUID hostId;
    private String roomName;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer totalNights;
    private BigDecimal totalAmount;
    private String currency;
    private BookingStatus status;
    private String statusDisplayName;
    private String paymentIntentId;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime paidAt;
    private LocalDateTime checkedInAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    private Integer guestCount;
    private String guestNotes;
    private Long secondsUntilExpiry;

    public static String getStatusDisplayName(BookingStatus status) {
        return switch (status) {
            case PENDING_PAYMENT -> "Pending payment";
            case EXPIRED -> "Expired";
            case CONFIRMED -> "Confirmed";
            case CHECKED_IN -> "Checked in";
            case CHECKED_OUT -> "Checked out";
            case COMPLETED -> "Completed";
            case CANCELLED_BY_GUEST -> "Cancelled by guest";
            case CANCELLED_BY_HOST -> "Cancelled by host";
            case CANCELLED_BY_ADMIN -> "Cancelled by admin";
        };
    }
}
