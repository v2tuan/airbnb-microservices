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
public class AdminTransactionRecordResponse {
    private UUID id;
    private String type;
    private UUID bookingId;
    private UUID customerId;
    private UUID counterpartyId;
    private String status;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
    private String description;
    private String providerId;
    private LocalDateTime createdAt;
}
