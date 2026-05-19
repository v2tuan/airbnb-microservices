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
    private String roomName;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer totalNights;
    private BigDecimal totalAmount;
    private String currency;
    private BookingStatus status;
    private String statusDisplayName;  // Status dạng text dễ đọc cho UI
    private String paymentIntentId;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime paidAt;
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
            case PENDING_PAYMENT -> "Chờ thanh toán";
            case PAID -> "Đã thanh toán";
            case EXPIRED -> "Hết hạn";
            case CANCELLED -> "Đã hủy";
        };
    }
}
