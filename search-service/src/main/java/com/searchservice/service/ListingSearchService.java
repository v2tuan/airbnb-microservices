package com.searchservice.service;

import com.searchservice.dto.request.SearchRequest;
import com.searchservice.dto.response.SearchResponse;
import com.searchservice.mapper.ListingMapper;
import com.searchservice.repository.ListingSearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.stream.StreamSupport;

@Service
@RequiredArgsConstructor
public class ListingSearchService {
  private final ListingSearchRepository listingSearchRepository;
  private final ListingMapper mapper;

  public SearchResponse search(SearchRequest request) {
    var docs = StreamSupport.stream(listingSearchRepository.findAll().spliterator(), false).toList();

    SearchResponse response = new SearchResponse();
    response.setListings(mapper.toCards(docs));
    response.setTotal((long) response.getListings().size());

    return response;
  }
}
