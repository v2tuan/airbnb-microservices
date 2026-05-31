package com.bookingservice.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class BookingRefundRequest {
    @NotNull
    @DecimalMin("0.01")
    private BigDecimal refundAmount;

    @NotBlank
    private String refundReason;

    private String refundDetails;
}
