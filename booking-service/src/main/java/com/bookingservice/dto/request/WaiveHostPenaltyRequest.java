package com.bookingservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class WaiveHostPenaltyRequest {
    @NotBlank
    @Size(max = 1000)
    private String reason;
}
