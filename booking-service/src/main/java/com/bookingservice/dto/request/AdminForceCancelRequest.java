package com.bookingservice.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AdminForceCancelRequest {
    @NotBlank
    @Size(max = 200)
    private String reason;

    @NotBlank
    @Size(max = 2000)
    private String adminNote;

    @DecimalMin("0.01")
    private BigDecimal refundAmount;
}
