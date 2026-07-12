package com.listingservice.repository.projection;

import java.math.BigDecimal;
import java.util.UUID;

public interface HomeDestinationCardProjection {
    UUID getListingId();

    String getTitle();

    String getCity();

    String getCountry();

    String getCoverImageUrl();

    BigDecimal getBasePrice();

    String getCurrency();

    Integer getMaxGuests();

    Boolean getInstantBook();

    String getDestinationKey();
}
