package com.paymentservice.dto.request;

public enum BookingStatus {
    PENDING_PAYMENT,
    EXPIRED,
    CONFIRMED,
    CHECKED_IN,
    CHECKED_OUT,
    COMPLETED,
    CANCELLED_BY_GUEST,
    CANCELLED_BY_HOST,
    CANCELLED_BY_ADMIN
}
