package com.listingservice.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ListingPhotoResponse {
    
    UUID photoId;
    UUID listingId;
    String photoUrl;
    String caption;
    Integer displayOrder;
    Boolean isCover;
    LocalDateTime uploadedAt;
}