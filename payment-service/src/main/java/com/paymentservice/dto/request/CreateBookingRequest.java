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
@NoArgsConstructor
@AllArgsConstructor
public class CreateBookingRequest {
    @NotNull(message = "Room ID không được để trống")
    private UUID roomId;

    @NotNull(message = "Ngày check-in không được để trống")
    @FutureOrPresent(message = "Ngày check-in phải từ hôm nay trở đi")
    private LocalDate checkInDate;

    @NotNull(message = "Ngày check-out không được để trống")
    @Future(message = "Ngày check-out phải là ngày trong tương lai")
    private LocalDate checkOutDate;

    @Pattern(regexp = "USD|VND|EUR", message = "Currency phải là USD, VND hoặc EUR")
    @Builder.Default
    private String currency = "USD";

    @Min(1) @Max(20)
    @Builder.Default
    private Integer numberOfAdults = 1;

    @Min(1) @Max(20)
    private Integer numberOfChildren;

    @Min(1) @Max(20)
    private Integer numberOfInfants;

    @Min(1) @Max(20)
    private Integer numberOfPets;

    @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
    private String guestNotes;
}
