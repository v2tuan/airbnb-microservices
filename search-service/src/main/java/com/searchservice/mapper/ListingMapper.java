package com.searchservice.mapper;

import com.searchservice.document.ListingDocument;
import com.searchservice.dto.response.ListingCardResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ListingMapper {
  @Mapping(source = "location.city", target = "city")
  @Mapping(source = "pricing.basePrice", target = "price")
  @Mapping(source = "statistics.averageRating", target = "rating")
  ListingCardResponse toCard(ListingDocument doc);

  List<ListingCardResponse> toCards(List<ListingDocument> docs);
}