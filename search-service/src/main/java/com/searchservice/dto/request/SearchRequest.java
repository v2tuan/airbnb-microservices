package com.searchservice.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class SearchRequest {
  private String city;

  private Integer guests;

  private Float minPrice;

  private Float maxPrice;

  private List<String> amenities;
}
