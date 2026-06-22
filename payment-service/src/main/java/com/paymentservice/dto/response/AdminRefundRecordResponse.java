package com.paymentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminRefundRecordResponse {
    private UUID refundId;
    private UUID bookingId;
    private UUID paymentId;
    private UUID guestId;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String businessCause;
    private String paymentStatus;
    private String providerRefundId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
