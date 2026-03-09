package com.searchservice.dto.request;

import java.util.List;

public class SearchRequest {
  private String city;

  private Integer guests;

  private Float minPrice;

  private Float maxPrice;

  private List<String> amenities;
}
