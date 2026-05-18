package com.userservice.entity;

public enum StripeAccountStatus {
    NONE,           // Chưa bắt đầu
    PENDING,        // Đã tạo account, chưa hoàn tất onboarding
    ACTIVE          // Đã hoàn tất, có thể nhận tiền
}
