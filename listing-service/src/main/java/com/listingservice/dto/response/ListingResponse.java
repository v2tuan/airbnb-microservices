package com.listingservice.dto.response;

import com.listingservice.constant.ListingStatus;
import com.listingservice.constant.PropertyType;
import com.listingservice.constant.RoomType;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ListingResponse {
    
    UUID listingId;
    String hostId;  // Keycloak user ID
    String title;
    String description;
    PropertyType propertyType;
    RoomType roomType;
    Integer numBedrooms;
    Integer numBeds;
    BigDecimal numBathrooms;
    Integer maxGuests;
    String address;
    String city;
    String state;
    String country;
    String postalCode;
    BigDecimal latitude;
    BigDecimal longitude;
    ListingStatus status;
    Boolean instantBook;
    LocalTime checkInStartTime;
    LocalTime checkInEndTime;
    LocalTime checkOutTime;
    String cancellationPolicyCode;
    LocalDateTime suspendedUntil;
    String suspensionReason;
    
    List<ListingPhotoResponse> photos;
    List<AmenityResponse> amenities;
    ListingPricingResponse pricing;
    HouseRulesResponse houseRules;
    
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
