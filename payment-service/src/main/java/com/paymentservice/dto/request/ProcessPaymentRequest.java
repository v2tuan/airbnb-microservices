package com.paymentservice.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessPaymentRequest {

    @NotNull(message = "Booking ID is required")
    private UUID bookingId;

    @NotNull(message = "Payer ID is required")
    private UUID payerId;

    @NotNull(message = "Payee ID is required")
    private UUID payeeId;

    @NotNull(message = "Payment method ID is required")
    private UUID paymentMethodId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotBlank(message = "Currency is required")
    private String currency = "VND";

    private String description;
}
