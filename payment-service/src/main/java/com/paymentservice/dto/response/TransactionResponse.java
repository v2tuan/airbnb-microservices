package com.paymentservice.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionResponse {

    private UUID transactionId;
    private UUID bookingId;
    private UUID payerId;
    private UUID payeeId;
    private UUID paymentMethodId;
    private String transactionType;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String gatewayTransactionId;
    private String failureReason;
    private String description;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime initiatedAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime completedAt;
}
