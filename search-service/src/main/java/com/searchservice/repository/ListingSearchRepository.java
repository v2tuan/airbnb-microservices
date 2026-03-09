package com.searchservice.repository;

import com.searchservice.document.ListingDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ListingSearchRepository extends ElasticsearchRepository<ListingDocument, String> {
  List<ListingDocument> findByCity(String city);

  List<ListingDocument> findByRoomType(String roomType);
}
