package com.listingservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ListingPhotoRequest {
    
    @NotBlank(message = "PHOTO_URL_REQUIRED")
    String photoUrl;
    
    @Size(max = 255, message = "CAPTION_TOO_LONG")
    String caption;
}