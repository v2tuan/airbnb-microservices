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
public class ListingUpdateRequest {
    
    @Size(max = 255, message = "TITLE_TOO_LONG")
    String title;
    
    String description;
    
    PropertyType propertyType;
    
    RoomType roomType;
    
    @Min(value = 0, message = "NUM_BEDROOMS_INVALID")
    Integer numBedrooms;
    
    @Min(value = 1, message = "NUM_BEDS_INVALID")
    Integer numBeds;
    
    @DecimalMin(value = "0.5", message = "NUM_BATHROOMS_INVALID")
    BigDecimal numBathrooms;
    
    @Min(value = 1, message = "MAX_GUESTS_INVALID")
    Integer maxGuests;
    
    String address;
    
    @Size(max = 100, message = "CITY_TOO_LONG")
    String city;
    
    @Size(max = 100, message = "STATE_TOO_LONG")
    String state;
    
    @Size(max = 100, message = "COUNTRY_TOO_LONG")
    String country;
    
    @Size(max = 20, message = "POSTAL_CODE_TOO_LONG")
    String postalCode;
    
    @DecimalMin(value = "-90.0", message = "LATITUDE_INVALID")
    @DecimalMax(value = "90.0", message = "LATITUDE_INVALID")
    BigDecimal latitude;
    
    @DecimalMin(value = "-180.0", message = "LONGITUDE_INVALID")
    @DecimalMax(value = "180.0", message = "LONGITUDE_INVALID")
    BigDecimal longitude;

    @Pattern(regexp = "FLEXIBLE|MODERATE|STRICT", message = "INVALID_CANCELLATION_POLICY")
    String cancellationPolicyCode;
    
    Boolean instantBook;

    LocalTime checkInStartTime;

    LocalTime checkInEndTime;

    LocalTime checkOutTime;
}
