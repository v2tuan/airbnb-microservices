package com.bookingservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ListingUnsuspensionRequest {
    @NotBlank
    @Size(max = 500)
    private String reason;
}
