package com.bookingservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ListingSuspensionRequest {
    @NotNull
    private LocalDateTime suspendedUntil;

    @NotBlank
    private String reason;
}
