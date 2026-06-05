package com.bookingservice.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
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
    private String businessCause;
    private UUID businessCauseId;
    private String failureReason;
    private String gatewayRefundId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime initiatedAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime completedAt;
}
