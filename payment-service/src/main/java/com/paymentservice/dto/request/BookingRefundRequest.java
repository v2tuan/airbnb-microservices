package com.paymentservice.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class BookingRefundRequest {
    @NotNull(message = "Refund amount is required")
    @DecimalMin(value = "0.01", message = "Refund amount must be greater than 0")
    private BigDecimal refundAmount;

    @NotBlank(message = "Refund reason is required")
    private String refundReason;

    private String refundDetails;

    @NotBlank(message = "Business cause is required")
    private String businessCause;

    @NotNull(message = "Business cause ID is required")
    private UUID businessCauseId;
}
