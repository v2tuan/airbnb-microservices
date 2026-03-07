package com.listingservice.repository;

import com.listingservice.entity.ListingPricing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ListingPricingRepository extends JpaRepository<ListingPricing, UUID> {
    
    // Tìm pricing theo listing
    Optional<ListingPricing> findByListingListingId(UUID listingId);
    
    // Xóa pricing theo listing
    void deleteByListingListingId(UUID listingId);
    
    // Kiểm tra listing đã có pricing chưa
    boolean existsByListingListingId(UUID listingId);
}