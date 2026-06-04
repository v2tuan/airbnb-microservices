package com.listingservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ListingSuspensionRequest {
    @NotNull
    private LocalDateTime suspendedUntil;

    @NotBlank
    private String reason;
}
