package com.listingservice.repository;

import com.listingservice.search.ListingSearchCriteria;

import java.util.List;
import java.util.UUID;

public interface ListingSearchRepository {
    List<UUID> findCandidateIds(ListingSearchCriteria criteria);
}
