package com.listingservice.dto.request;

import com.listingservice.constant.PropertyType;
import com.listingservice.constant.RoomType;
import jakarta.validation.constraints.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ListingCreationRequest {

    @NotBlank(message = "TITLE_REQUIRED")
    @Size(max = 255, message = "TITLE_TOO_LONG")
    String title;
    
    @NotBlank(message = "DESCRIPTION_REQUIRED")
    String description;
    
    @NotNull(message = "PROPERTY_TYPE_REQUIRED")
    PropertyType propertyType;
    
    @NotNull(message = "ROOM_TYPE_REQUIRED")
    RoomType roomType;
    
    @NotNull(message = "NUM_BEDROOMS_REQUIRED")
    @Min(value = 0, message = "NUM_BEDROOMS_INVALID")
    Integer numBedrooms;
    
    @NotNull(message = "NUM_BEDS_REQUIRED")
    @Min(value = 1, message = "NUM_BEDS_INVALID")
    Integer numBeds;
    
    @NotNull(message = "NUM_BATHROOMS_REQUIRED")
    @DecimalMin(value = "0.5", message = "NUM_BATHROOMS_INVALID")
    BigDecimal numBathrooms;
    
    @NotNull(message = "MAX_GUESTS_REQUIRED")
    @Min(value = 1, message = "MAX_GUESTS_INVALID")
    Integer maxGuests;
    
    @NotBlank(message = "ADDRESS_REQUIRED")
    String address;
    
    @NotBlank(message = "CITY_REQUIRED")
    @Size(max = 100, message = "CITY_TOO_LONG")
    String city;
    
    @Size(max = 100, message = "STATE_TOO_LONG")
    String state;
    
    @NotBlank(message = "COUNTRY_REQUIRED")
    @Size(max = 100, message = "COUNTRY_TOO_LONG")
    String country;
    
    @Size(max = 20, message = "POSTAL_CODE_TOO_LONG")
    String postalCode;
    
    @NotNull(message = "LATITUDE_REQUIRED")
    @DecimalMin(value = "-90.0", message = "LATITUDE_INVALID")
    @DecimalMax(value = "90.0", message = "LATITUDE_INVALID")
    BigDecimal latitude;
    
    @NotNull(message = "LONGITUDE_REQUIRED")
    @DecimalMin(value = "-180.0", message = "LONGITUDE_INVALID")
    @DecimalMax(value = "180.0", message = "LONGITUDE_INVALID")
    BigDecimal longitude;

    @Pattern(regexp = "FLEXIBLE|MODERATE|STRICT", message = "INVALID_CANCELLATION_POLICY")
    String cancellationPolicyCode = "FLEXIBLE";
    
    Boolean instantBook;

    @NotNull(message = "CHECK_IN_START_TIME_REQUIRED")
    LocalTime checkInStartTime;

    LocalTime checkInEndTime;

    @NotNull(message = "CHECK_OUT_TIME_REQUIRED")
    LocalTime checkOutTime;
}
