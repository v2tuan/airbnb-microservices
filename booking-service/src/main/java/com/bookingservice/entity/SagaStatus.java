package com.bookingservice.entity;

public enum SagaStatus {
    STARTED,       // Saga mới bắt đầu
    PROCESSING,    // Đang xử lý step hiện tại
    COMPLETED,     // Tất cả bước thành công
    COMPENSATING,  // Đang chạy compensating transactions
    COMPENSATED,   // Đã rollback thành công
    FAILED         // Compensate cũng fail — cần manual intervention
}
