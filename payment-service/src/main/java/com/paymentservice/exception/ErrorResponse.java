package com.paymentservice.exception;

import java.time.Instant;

public record ErrorResponse(
        String message,
        String errorCode,
        int status,
        String path,
        Instant timestamp
) {
}
