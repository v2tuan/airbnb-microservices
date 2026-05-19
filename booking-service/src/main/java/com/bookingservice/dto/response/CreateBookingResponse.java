package com.bookingservice.dto.response;

import com.bookingservice.entity.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBookingResponse {
    private UUID bookingId;
    private String hostId;
    private BookingStatus status;
    private long totalAmount;
    private String currency;
    private LocalDateTime expiresAt;
    private String message;  // Message thông báo cho user
}
