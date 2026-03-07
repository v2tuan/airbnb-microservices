package com.searchservice.repository;

import com.searchservice.document.ListingDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ListingSearchRepository extends JpaRepository<ListingDocument, String> {

}
