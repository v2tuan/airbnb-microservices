package com.bookingservice.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class RefundResponse {
    private UUID refundId;
    private UUID originalTransactionId;
    private UUID refundTransactionId;
    private BigDecimal refundAmount;
    private String refundType;
    private String refundReason;
    private String refundDetails;
    private String status;
    private String gatewayRefundId;
    private LocalDateTime initiatedAt;
    private LocalDateTime completedAt;
}
