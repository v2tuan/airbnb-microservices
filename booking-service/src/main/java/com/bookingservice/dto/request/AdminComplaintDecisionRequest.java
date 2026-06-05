package com.bookingservice.dto.request;

import com.bookingservice.entity.AdminComplaintDecision;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AdminComplaintDecisionRequest {
    @NotNull
    private AdminComplaintDecision decision;

    @NotBlank
    @Size(max = 2000)
    private String adminNote;

    @DecimalMin("0.01")
    private BigDecimal refundAmount;
}
