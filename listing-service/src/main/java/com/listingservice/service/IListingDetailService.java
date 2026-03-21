package com.listingservice.service;

import com.listingservice.dto.response.CompositeListingResponse;

import java.time.LocalDate;
import java.util.UUID;

public interface IListingDetailService {
  CompositeListingResponse getDetail(
      UUID listingId,
      LocalDate checkIn,
      LocalDate checkOut,
      Integer adults,
      Integer children,
      Integer infants,
      Integer pets);
}
