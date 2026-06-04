package com.listingservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ListingUnsuspensionRequest {
    @NotBlank
    @Size(max = 500)
    private String reason;
}
