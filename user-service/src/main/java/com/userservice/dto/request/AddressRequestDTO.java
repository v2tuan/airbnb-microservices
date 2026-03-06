package com.userservice.dto.request;

public record AddressRequestDTO(
    String addressType, // HOME, WORK
    String streetAddress,
    String city,
    String country,
    String postalCode,
    Boolean isDefault
) {
}
