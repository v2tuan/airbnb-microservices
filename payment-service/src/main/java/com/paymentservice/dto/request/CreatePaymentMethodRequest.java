package com.paymentservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePaymentMethodRequest {

    @NotBlank(message = "Method type is required")
    private String methodType; // CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, E_WALLET

    @NotBlank(message = "Provider is required")
    private String provider; // VISA, MASTERCARD, MOMO, VNPAY

    @NotBlank(message = "Token is required")
    private String token;

    private String lastFourDigits;
    private String cardBrand;
    private Integer expiryMonth;
    private Integer expiryYear;
    private String cardholderName;

    @NotNull(message = "isDefault cannot be null")
    private Boolean isDefault = false;
}
