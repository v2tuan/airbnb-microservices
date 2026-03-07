package com.listingservice.repository;

import com.listingservice.entity.HouseRules;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface HouseRulesRepository extends JpaRepository<HouseRules, UUID> {
    
    // Tìm house rules theo listing
    Optional<HouseRules> findByListingListingId(UUID listingId);
    
    // Xóa house rules theo listing
    void deleteByListingListingId(UUID listingId);
    
    // Kiểm tra listing đã có house rules chưa
    boolean existsByListingListingId(UUID listingId);
}