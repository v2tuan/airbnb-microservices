package com.listingservice.dto.request;

import com.listingservice.constant.PropertyType;
import com.listingservice.constant.RoomType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ListingFilterRequest {

    @Size(max = 120, message = "KEYWORD_TOO_LONG")
    String keyword;

    @Size(max = 100, message = "CITY_TOO_LONG")
    String city;

    @Size(max = 100, message = "STATE_TOO_LONG")
    String state;

    @Size(max = 100, message = "COUNTRY_TOO_LONG")
    String country;

    @Min(value = 1, message = "GUESTS_INVALID")
    Integer guests;

    @Min(value = 0, message = "MIN_BEDROOMS_INVALID")
    Integer minBedrooms;

    @Min(value = 1, message = "MIN_BEDS_INVALID")
    Integer minBeds;

    @DecimalMin(value = "0.5", message = "MIN_BATHROOMS_INVALID")
    BigDecimal minBathrooms;

    @DecimalMin(value = "0.0", message = "MIN_PRICE_INVALID")
    BigDecimal minPrice;

    @DecimalMin(value = "0.0", message = "MAX_PRICE_INVALID")
    BigDecimal maxPrice;

    List<PropertyType> propertyTypes;

    List<RoomType> roomTypes;

    Boolean instantBook;

    List<UUID> amenityIds;

    List<String> amenityNames;

    @DecimalMin(value = "-90.0", message = "LATITUDE_INVALID")
    @DecimalMax(value = "90.0", message = "LATITUDE_INVALID")
    BigDecimal latitude;

    @DecimalMin(value = "-180.0", message = "LONGITUDE_INVALID")
    @DecimalMax(value = "180.0", message = "LONGITUDE_INVALID")
    BigDecimal longitude;

    @DecimalMin(value = "0.1", message = "RADIUS_INVALID")
    Double radiusKm;

    LocalDate checkIn;

    LocalDate checkOut;

    @Size(max = 30, message = "SORT_BY_TOO_LONG")
    String sortBy;

    @Min(value = 1, message = "LIMIT_INVALID")
    Integer limit;
}
