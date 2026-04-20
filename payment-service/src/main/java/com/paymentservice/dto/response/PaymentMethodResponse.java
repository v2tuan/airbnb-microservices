package com.paymentservice.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentMethodResponse {

    private UUID paymentMethodId;
    private UUID userId;
    private String methodType;
    private String provider;
    private String lastFourDigits;
    private String cardBrand;
    private Integer expiryMonth;
    private Integer expiryYear;
    private String cardholderName;
    private Boolean isDefault;
    private Boolean isVerified;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
