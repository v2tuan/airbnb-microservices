package com.listingservice.repository.projection;

import java.math.BigDecimal;
import java.util.UUID;

public interface HomeListingCardProjection {
    UUID getListingId();

    String getTitle();

    String getCity();

    String getState();

    String getCountry();

    String getCoverImageUrl();

    BigDecimal getBasePrice();

    String getCurrency();

    Integer getMaxGuests();

    Boolean getInstantBook();
}
