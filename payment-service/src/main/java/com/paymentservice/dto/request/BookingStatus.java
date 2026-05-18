package com.paymentservice.dto.request;

public enum BookingStatus {
    /**
     * Booking đã được tạo, đang chờ user hoàn thành thanh toán.
     * Đây là trạng thái INITIAL ngay sau khi user bấm "Đặt phòng".
     * Booking ở trạng thái này sẽ tự động EXPIRED sau 15 phút.
     */
    PENDING_PAYMENT,

    /**
     * Thanh toán đã thành công.
     * Trạng thái được set bởi webhook từ Stripe khi nhận event payment_intent.succeeded.
     */
    PAID,

    /**
     * Booking đã hết hạn do user không hoàn thành thanh toán trong 15 phút.
     * Được set bởi Scheduled Task chạy định kỳ.
     */
    EXPIRED,

    /**
     * Booking bị hủy (bởi user hoặc admin).
     */
    CANCELLED
}
