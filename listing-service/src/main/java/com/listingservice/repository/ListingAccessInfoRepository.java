package com.listingservice.repository;

import com.listingservice.entity.ListingAccessInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ListingAccessInfoRepository extends JpaRepository<ListingAccessInfo, UUID> {
    Optional<ListingAccessInfo> findByListingListingId(UUID listingId);
    void deleteByListingListingId(UUID listingId);
    boolean existsByListingListingId(UUID listingId);
}
