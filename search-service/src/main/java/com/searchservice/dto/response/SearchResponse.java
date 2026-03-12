package com.searchservice.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class SearchResponse {
  private List<ListingCardResponse> listings;

  private Long total;
}
