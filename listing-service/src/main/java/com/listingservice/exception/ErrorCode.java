package com.listingservice.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {
    // General errors
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Invalid message key", HttpStatus.BAD_REQUEST),
    
    // Listing errors (2000-2099)
    LISTING_NOT_FOUND(2001, "Listing not found", HttpStatus.NOT_FOUND),
    LISTING_ALREADY_EXISTS(2002, "Listing already exists", HttpStatus.BAD_REQUEST),
    LISTING_NOT_ACTIVE(2003, "Listing is not active", HttpStatus.BAD_REQUEST),
    LISTING_NOT_AVAILABLE(2004, "Listing is not available for selected dates", HttpStatus.BAD_REQUEST),
    INVALID_LISTING_STATUS(2005, "Invalid listing status", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED_LISTING_ACCESS(2006, "You do not have permission to access this listing", HttpStatus.FORBIDDEN),
    
    // Amenity errors (2100-2199)
    AMENITY_NOT_FOUND(2101, "Amenity not found", HttpStatus.NOT_FOUND),
    AMENITY_EXISTED(2102, "Amenity already exists", HttpStatus.BAD_REQUEST),
    AMENITY_ALREADY_ADDED(2103, "Amenity already added to listing", HttpStatus.BAD_REQUEST),
    AMENITY_NOT_FOUND_IN_LISTING(2104, "Amenity not found in listing", HttpStatus.NOT_FOUND),
    INVALID_AMENITY_CATEGORY(2105, "Invalid amenity category", HttpStatus.BAD_REQUEST),
    
    // Pricing errors (2200-2299)
    PRICING_NOT_FOUND(2201, "Pricing not found", HttpStatus.NOT_FOUND),
    INVALID_PRICE_RANGE(2202, "Invalid price range", HttpStatus.BAD_REQUEST),
    CUSTOM_PRICING_NOT_FOUND(2203, "Custom pricing not found", HttpStatus.NOT_FOUND),
    CUSTOM_PRICING_ALREADY_EXISTS(2204, "Custom pricing already exists for this date", HttpStatus.BAD_REQUEST),
    PRICE_TOO_LOW(2205, "Price is too low", HttpStatus.BAD_REQUEST),
    PRICE_TOO_HIGH(2206, "Price is too high", HttpStatus.BAD_REQUEST),
    
    // Photo errors (2300-2399)
    PHOTO_NOT_FOUND(2301, "Photo not found", HttpStatus.NOT_FOUND),
    PHOTO_UPLOAD_FAILED(2302, "Photo upload failed", HttpStatus.INTERNAL_SERVER_ERROR),
    PHOTO_NOT_BELONGS_TO_LISTING(2303, "Photo does not belong to this listing", HttpStatus.BAD_REQUEST),
    MAX_PHOTOS_EXCEEDED(2304, "Maximum number of photos exceeded", HttpStatus.BAD_REQUEST),
    PHOTO_DELETE_FAILED(2305, "Photo delete failed", HttpStatus.INTERNAL_SERVER_ERROR),
    
    // Availability errors (2400-2499)
    AVAILABILITY_NOT_FOUND(2401, "Availability not found", HttpStatus.NOT_FOUND),
    DATE_NOT_AVAILABLE(2402, "Date is not available", HttpStatus.BAD_REQUEST),
    INVALID_DATE_RANGE(2403, "Invalid date range", HttpStatus.BAD_REQUEST),
    PAST_DATE_NOT_ALLOWED(2404, "Cannot set availability for past dates", HttpStatus.BAD_REQUEST),
    DATE_ALREADY_BOOKED(2405, "Date is already booked", HttpStatus.BAD_REQUEST),
    
    // House Rules errors (2500-2599)
    HOUSE_RULES_NOT_FOUND(2501, "House rules not found", HttpStatus.NOT_FOUND),
    INVALID_CHECK_IN_TIME(2502, "Invalid check-in time", HttpStatus.BAD_REQUEST),
    INVALID_CHECK_OUT_TIME(2503, "Invalid check-out time", HttpStatus.BAD_REQUEST),
    
    // Validation errors (2600-2699)
    TITLE_REQUIRED(2601, "Title is required", HttpStatus.BAD_REQUEST),
    TITLE_TOO_LONG(2602, "Title is too long", HttpStatus.BAD_REQUEST),
    DESCRIPTION_REQUIRED(2603, "Description is required", HttpStatus.BAD_REQUEST),
    PROPERTY_TYPE_REQUIRED(2604, "Property type is required", HttpStatus.BAD_REQUEST),
    ROOM_TYPE_REQUIRED(2605, "Room type is required", HttpStatus.BAD_REQUEST),
    NUM_BEDROOMS_REQUIRED(2606, "Number of bedrooms is required", HttpStatus.BAD_REQUEST),
    NUM_BEDROOMS_INVALID(2607, "Number of bedrooms must be at least 0", HttpStatus.BAD_REQUEST),
    NUM_BEDS_REQUIRED(2608, "Number of beds is required", HttpStatus.BAD_REQUEST),
    NUM_BEDS_INVALID(2609, "Number of beds must be at least 1", HttpStatus.BAD_REQUEST),
    NUM_BATHROOMS_REQUIRED(2610, "Number of bathrooms is required", HttpStatus.BAD_REQUEST),
    NUM_BATHROOMS_INVALID(2611, "Number of bathrooms must be at least 0.5", HttpStatus.BAD_REQUEST),
    MAX_GUESTS_REQUIRED(2612, "Maximum guests is required", HttpStatus.BAD_REQUEST),
    MAX_GUESTS_INVALID(2613, "Maximum guests must be at least 1", HttpStatus.BAD_REQUEST),
    ADDRESS_REQUIRED(2614, "Address is required", HttpStatus.BAD_REQUEST),
    CITY_REQUIRED(2615, "City is required", HttpStatus.BAD_REQUEST),
    CITY_TOO_LONG(2616, "City name is too long", HttpStatus.BAD_REQUEST),
    STATE_TOO_LONG(2617, "State name is too long", HttpStatus.BAD_REQUEST),
    COUNTRY_REQUIRED(2618, "Country is required", HttpStatus.BAD_REQUEST),
    COUNTRY_TOO_LONG(2619, "Country name is too long", HttpStatus.BAD_REQUEST),
    POSTAL_CODE_TOO_LONG(2620, "Postal code is too long", HttpStatus.BAD_REQUEST),
    LATITUDE_REQUIRED(2621, "Latitude is required", HttpStatus.BAD_REQUEST),
    LATITUDE_INVALID(2622, "Latitude must be between -90 and 90", HttpStatus.BAD_REQUEST),
    LONGITUDE_REQUIRED(2623, "Longitude is required", HttpStatus.BAD_REQUEST),
    LONGITUDE_INVALID(2624, "Longitude must be between -180 and 180", HttpStatus.BAD_REQUEST),
    HOST_ID_REQUIRED(2625, "Host ID is required", HttpStatus.BAD_REQUEST),
    
    // Amenity validation errors
    AMENITY_NAME_REQUIRED(2631, "Amenity name is required", HttpStatus.BAD_REQUEST),
    AMENITY_NAME_TOO_LONG(2632, "Amenity name is too long", HttpStatus.BAD_REQUEST),
    AMENITY_CATEGORY_REQUIRED(2633, "Amenity category is required", HttpStatus.BAD_REQUEST),
    
    // Pricing validation errors
    BASE_PRICE_REQUIRED(2641, "Base price is required", HttpStatus.BAD_REQUEST),
    BASE_PRICE_INVALID(2642, "Base price must be greater than 0", HttpStatus.BAD_REQUEST),
    CURRENCY_INVALID(2643, "Currency code must be 3 characters", HttpStatus.BAD_REQUEST),
    CLEANING_FEE_INVALID(2644, "Cleaning fee must be 0 or greater", HttpStatus.BAD_REQUEST),
    SERVICE_FEE_INVALID(2645, "Service fee must be between 0 and 100", HttpStatus.BAD_REQUEST),
    WEEKEND_PRICE_INVALID(2646, "Weekend price must be greater than 0", HttpStatus.BAD_REQUEST),
    WEEKLY_DISCOUNT_INVALID(2647, "Weekly discount must be between 0 and 100", HttpStatus.BAD_REQUEST),
    MONTHLY_DISCOUNT_INVALID(2648, "Monthly discount must be between 0 and 100", HttpStatus.BAD_REQUEST),
    
    // Date/Time validation errors
    DATE_REQUIRED(2651, "Date is required", HttpStatus.BAD_REQUEST),
    PRICE_REQUIRED(2652, "Price is required", HttpStatus.BAD_REQUEST),
    PRICE_INVALID(2653, "Price must be greater than 0", HttpStatus.BAD_REQUEST),
    IS_AVAILABLE_REQUIRED(2654, "Availability status is required", HttpStatus.BAD_REQUEST),
    MIN_NIGHTS_INVALID(2655, "Minimum nights must be at least 1", HttpStatus.BAD_REQUEST),
    MAX_NIGHTS_INVALID(2656, "Maximum nights must be at least 1", HttpStatus.BAD_REQUEST),
    CHECK_IN_FROM_REQUIRED(2657, "Check-in start time is required", HttpStatus.BAD_REQUEST),
    CHECK_IN_TO_REQUIRED(2658, "Check-in end time is required", HttpStatus.BAD_REQUEST),
    CHECK_OUT_TIME_REQUIRED(2659, "Check-out time is required", HttpStatus.BAD_REQUEST),
    CHECK_IN_START_TIME_REQUIRED(2660, "Check-in start time is required", HttpStatus.BAD_REQUEST),
    
    // Photo validation errors
    PHOTO_URL_REQUIRED(2661, "Photo URL is required", HttpStatus.BAD_REQUEST),
    CAPTION_TOO_LONG(2662, "Caption is too long", HttpStatus.BAD_REQUEST),
    ;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;
}
