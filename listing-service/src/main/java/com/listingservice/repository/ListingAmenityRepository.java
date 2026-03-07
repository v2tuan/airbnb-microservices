package com.listingservice.repository;

import com.listingservice.entity.ListingAmenity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ListingAmenityRepository extends JpaRepository<ListingAmenity, UUID> {
    
    // Tìm tất cả amenities của listing
    List<ListingAmenity> findByListingListingId(UUID listingId);
    
    // Tìm theo listing và amenity
    Optional<ListingAmenity> findByListingListingIdAndAmenityAmenityId(UUID listingId, UUID amenityId);
    
    // Xóa theo listing và amenity
    void deleteByListingListingIdAndAmenityAmenityId(UUID listingId, UUID amenityId);
    
    // Xóa tất cả amenities của listing
    void deleteByListingListingId(UUID listingId);
    
    // Kiểm tra listing có amenity không
    boolean existsByListingListingIdAndAmenityAmenityId(UUID listingId, UUID amenityId);
    
    // Tìm listing có các amenities cụ thể
    @Query("SELECT DISTINCT la.listing.listingId FROM ListingAmenity la WHERE la.amenity.amenityId IN :amenityIds " +
           "GROUP BY la.listing.listingId HAVING COUNT(DISTINCT la.amenity.amenityId) = :amenityCount")
    List<UUID> findListingIdsByAmenities(@Param("amenityIds") List<UUID> amenityIds, @Param("amenityCount") long amenityCount);
}