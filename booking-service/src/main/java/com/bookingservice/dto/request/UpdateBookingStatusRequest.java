package com.bookingservice.dto.request;

import com.bookingservice.entity.BookingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBookingStatusRequest {
    @NotNull(message = "Status không được để trống")
    private BookingStatus status;

    // PaymentIntent ID từ Stripe để lưu vào booking
    private String paymentIntentId;
}
