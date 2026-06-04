package com.bookingservice.dto.request;

import com.bookingservice.entity.HostCancellationReasonCode;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class HostCancellationQuoteRequest {
    @NotNull
    private HostCancellationReasonCode reasonCode;
}
