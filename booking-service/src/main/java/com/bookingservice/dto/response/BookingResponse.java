package com.bookingservice.dto.response;

import com.bookingservice.entity.BookingStatus;
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
    private long totalAmount;
    private String currency;
    private BookingStatus status;
    private String statusDisplayName;  // Status dạng text dễ đọc cho UI
    private String paymentIntentId;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime paidAt;
    private LocalDateTime checkedInAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    private Integer guestCount;
    private String guestNotes;

    /**
     * Thời gian còn lại để thanh toán (giây)
     * Tính từ expiresAt - now, nếu âm thì = 0
     */
    private Long secondsUntilExpiry;

    /**
     * Helper method lấy tên hiển thị cho status
     */
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
