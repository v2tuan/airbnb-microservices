package com.listingservice.repository;

import com.listingservice.entity.ListingPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ListingPhotoRepository extends JpaRepository<ListingPhoto, UUID> {
    
    // Tìm tất cả ảnh của listing
    List<ListingPhoto> findByListingListingIdOrderByDisplayOrderAsc(UUID listingId);
    
    // Tìm ảnh cover của listing
    Optional<ListingPhoto> findByListingListingIdAndIsCoverTrue(UUID listingId);
    
    // Xóa tất cả ảnh của listing
    void deleteByListingListingId(UUID listingId);
    
    // Đếm số ảnh của listing
    long countByListingListingId(UUID listingId);
}