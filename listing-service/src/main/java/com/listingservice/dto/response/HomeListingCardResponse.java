package com.listingservice.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HomeListingCardResponse {

    UUID listingId;
    String title;
    String city;
    String state;
    String country;
    String coverImageUrl;
    BigDecimal basePrice;
    BigDecimal rating;
    String currency;
    Integer maxGuests;
    Boolean instantBook;
}

