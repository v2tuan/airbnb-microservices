package com.searchservice.dto.response;

import lombok.Data;

@Data
public class ListingCardResponse {
  private String listingId;

  private String title;

  private String city;

  private Float price;

  private Float rating;

  private String coverPhoto;
}
