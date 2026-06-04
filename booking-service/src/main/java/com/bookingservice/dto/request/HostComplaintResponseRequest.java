package com.bookingservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class HostComplaintResponseRequest {
    @NotBlank
    @Size(max = 2000)
    private String response;
}
