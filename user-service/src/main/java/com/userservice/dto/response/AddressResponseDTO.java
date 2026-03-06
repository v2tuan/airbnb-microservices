package com.userservice.dto.response;

import java.util.UUID;

public record AddressResponseDTO (
    UUID addressId,
    String addressType,
    String fullAddress,
    Boolean isDefault
){
}
