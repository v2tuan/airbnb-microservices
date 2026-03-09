package com.searchservice.repository;

import com.searchservice.document.ListingDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ListingSearchRepository extends ElasticsearchRepository<ListingDocument, String> {

}
