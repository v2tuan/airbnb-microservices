package com.bookingservice.dto.request;

import com.bookingservice.entity.BookingStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload dùng chung cho các luồng cập nhật status Booking/Reservation.
 *
 * Payment Service dùng `paymentIntentId` khi webhook xác nhận thanh toán.
 * Host reservation management dùng `status` và optional `reason` khi cancel.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBookingStatusRequest {
    @NotNull(message = "Status không được để trống")
    private BookingStatus status;

    // PaymentIntent ID từ Stripe để lưu vào booking
    private String paymentIntentId;

    /**
     * Lý do hủy reservation/booking.
     * Backend giới hạn 500 ký tự để khớp column cancellation_reason và tránh lưu nội dung quá dài.
     */
    @Size(max = 500)
    private String reason;
}
