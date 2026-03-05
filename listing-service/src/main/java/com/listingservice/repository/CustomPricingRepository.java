package com.listingservice.repository;

import com.listingservice.entity.CustomPricing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomPricingRepository extends JpaRepository<CustomPricing, UUID> {
    
    // Tìm tất cả custom pricing của listing
    List<CustomPricing> findByListingListingId(UUID listingId);
    
    // Tìm custom pricing theo listing và ngày
    Optional<CustomPricing> findByListingListingIdAndDate(UUID listingId, LocalDate date);
    
    // Tìm trong khoảng thời gian
    List<CustomPricing> findByListingListingIdAndDateBetween(UUID listingId, LocalDate startDate, LocalDate endDate);
    
    // Xóa theo listing và ngày
    void deleteByListingListingIdAndDate(UUID listingId, LocalDate date);
    
    // Xóa tất cả custom pricing của listing
    void deleteByListingListingId(UUID listingId);
    
    // Kiểm tra đã có custom pricing cho ngày đó chưa
    boolean existsByListingListingIdAndDate(UUID listingId, LocalDate date);
}