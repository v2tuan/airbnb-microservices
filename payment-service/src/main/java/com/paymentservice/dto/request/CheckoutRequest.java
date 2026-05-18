package com.paymentservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CheckoutRequest {
    // --- Thông tin phòng ---
    @NotNull(message = "roomId không được trống")
    private UUID roomId;

//    @NotBlank(message = "roomName không được trống")
//    private String roomName;

    // --- Thông tin user ---
//    @NotNull(message = "userId không được trống")
//    private Long userId;

    // --- Ngày ở ---
    @NotNull(message = "checkInDate không được trống")
    private LocalDate checkInDate;

    @NotNull(message = "checkOutDate không được trống")
    private LocalDate checkOutDate;

    // --- Tiền ---
//    @NotNull(message = "totalAmount không được trống")
//    @DecimalMin(value = "0.50", message = "Số tiền tối thiểu là 0.50")
//    private BigDecimal totalAmount;

    /**
     * Currency code LOWERCASE cho Stripe: "usd", "vnd", ...
     * Stripe yêu cầu lowercase.
     */
    @Builder.Default
    private String currency = "usd";

    // --- Tùy chọn ---
    @Min(1) @Max(20)
    @Builder.Default
    private Integer numberOfAdults = 1;

    @Min(0) @Max(20)
    private Integer numberOfChildren;

    @Min(0) @Max(20)
    private Integer numberOfInfants;

    @Min(0) @Max(20)
    private Integer numberOfPets;

    @Size(max = 500)
    private String guestNotes;
}
