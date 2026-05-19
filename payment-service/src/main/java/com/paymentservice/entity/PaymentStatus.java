package com.paymentservice.entity;

public enum PaymentStatus {
    /**
     * PaymentIntent đã được tạo, Frontend đang xử lý thanh toán
     */
    CREATED,

    /**
     * Thanh toán thành công - nhận từ Stripe webhook event: payment_intent.succeeded
     */
    SUCCEEDED,

    /**
     * Thanh toán thất bại - nhận từ Stripe webhook event: payment_intent.payment_failed
     */
    FAILED,

    /**
     * PaymentIntent bị hủy
     */
    CANCELLED
}
