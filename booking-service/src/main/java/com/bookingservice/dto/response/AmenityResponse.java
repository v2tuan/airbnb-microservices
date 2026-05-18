package com.bookingservice.dto.response;

import com.bookingservice.constant.AmenityCategory;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AmenityResponse {
    
    UUID amenityId;
    String name;
    AmenityCategory category;
    String iconUrl;
    LocalDateTime createdAt;
}