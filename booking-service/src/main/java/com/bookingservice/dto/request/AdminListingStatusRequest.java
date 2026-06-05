package com.bookingservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AdminListingStatusRequest {
    private LocalDateTime suspendedUntil;

    @NotBlank
    @Size(max = 500)
    private String reason;
}
