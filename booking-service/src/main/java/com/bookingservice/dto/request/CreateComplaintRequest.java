package com.bookingservice.dto.request;

import com.bookingservice.entity.ComplaintType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateComplaintRequest {
    @NotNull
    private ComplaintType type;

    @NotBlank
    @Size(max = 2000)
    private String description;

    private List<@Size(max = 500) String> evidenceUrls;
}
