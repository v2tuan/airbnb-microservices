package com.paymentservice.entity;

/**
 * Trang thai vong doi cua payout tra tien cho host.
 *
 * Dung enum thay vi String de tranh sai chinh ta status va gom tat ca
 * status hop le vao mot noi.
 */
public enum PayoutStatus {
    /**
     * Payout duoc tao sau khi guest thanh toan thanh cong,
     * nhung con cho dieu kien check-in/check-out de tra tien host.
     */
    PENDING_CHECKIN,

    /**
     * Payout du dieu kien nghiep vu nhung duoc hen xu ly o thoi diem cu the.
     */
    SCHEDULED,

    /**
     * Scheduler dang xu ly payout va chuan bi goi Stripe Transfer.
     */
    PROCESSING,

    /**
     * Stripe Transfer da tao thanh cong, tien da chuyen sang connected account cua host.
     */
    COMPLETED,

    /**
     * Payout gap loi khong the xu ly tiep hoac da retry qua so lan cho phep.
     */
    FAILED,

    /**
     * Payout gap loi tam thoi va se duoc scheduler thu lai sau.
     */
    RETRY,

    /**
     * Payout bi huy vi booking/payment khong con du dieu kien tra tien cho host.
     */
    CANCELLED,

    /**
     * Payout da completed nhung sau do bi reverse do refund/hoan tien.
     */
    REVERSED
}
