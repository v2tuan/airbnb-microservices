package com.bookingservice.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class BookingRefundRequest {
    @NotNull
    @DecimalMin("0.01")
    private BigDecimal refundAmount;

    @NotBlank
    private String refundReason;

    private String refundDetails;

    @NotBlank
    private String businessCause;

    @NotNull
    private UUID businessCauseId;
}
