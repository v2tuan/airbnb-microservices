package com.listingservice.dto.request;

import com.listingservice.constant.AmenityCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AmenityRequest {
    
    @NotBlank(message = "AMENITY_NAME_REQUIRED")
    @Size(max = 100, message = "AMENITY_NAME_TOO_LONG")
    String name;
    
    @NotNull(message = "AMENITY_CATEGORY_REQUIRED")
    AmenityCategory category;
    
    String iconUrl;
}