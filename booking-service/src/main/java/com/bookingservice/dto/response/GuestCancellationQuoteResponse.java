package com.bookingservice.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class GuestCancellationQuoteResponse {
    private UUID quoteId;
    private UUID bookingId;
    private BigDecimal refundAmount;
    private BigDecimal nonRefundableAmount;
    private BigDecimal accommodationRefund;
    private BigDecimal cleaningFeeRefund;
    private BigDecimal serviceFeeRefund;
    private BigDecimal taxesRefund;
    private String currency;
    private String policyCode;
    private LocalDateTime expiresAt;
}
