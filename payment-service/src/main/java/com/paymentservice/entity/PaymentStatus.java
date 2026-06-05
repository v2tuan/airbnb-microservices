package com.paymentservice.entity;

public enum PaymentStatus {
    PAYMENT_PENDING,
    PAID,
    PAYMENT_FAILED,
    PAYMENT_CANCELLED,
    REFUND_PENDING,
    PARTIALLY_REFUNDED,
    REFUNDED,
    REFUND_FAILED
}
