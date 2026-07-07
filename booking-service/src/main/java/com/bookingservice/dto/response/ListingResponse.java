package com.bookingservice.dto.response;

import com.bookingservice.constant.ListingStatus;
import com.bookingservice.constant.PropertyType;
import com.bookingservice.constant.RoomType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
@JsonIgnoreProperties(ignoreUnknown = true)
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
    String cancellationPolicyCode;
    LocalTime checkInStartTime;
    LocalTime checkInEndTime;
    LocalTime checkOutTime;
    
    List<ListingPhotoResponse> photos;
    List<AmenityResponse> amenities;
    ListingPricingResponse pricing;
    HouseRulesResponse houseRules;
    ListingAccessInfoResponse accessInfo;
    
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
