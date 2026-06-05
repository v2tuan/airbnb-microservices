package com.bookingservice.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ConfirmCancellationQuoteRequest {
    @NotNull
    private UUID quoteId;

    @Size(max = 500)
    private String reason;
}
