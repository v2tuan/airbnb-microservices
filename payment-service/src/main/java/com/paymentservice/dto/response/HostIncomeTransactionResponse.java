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
public class HostIncomeTransactionResponse {
    private UUID id;
    private String type;
    private UUID bookingId;
    private String status;
    private BigDecimal amount;
    private String currency;
    private String payoutMethod;
    private String description;
    private String providerId;
    private String failureReason;
    private LocalDateTime scheduledAt;
    private LocalDateTime processedAt;
    private LocalDateTime createdAt;
}
