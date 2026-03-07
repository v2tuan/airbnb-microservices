package com.listingservice.repository;

import com.listingservice.constant.AmenityCategory;
import com.listingservice.entity.Amenity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AmenityRepository extends JpaRepository<Amenity, UUID> {
    
    // Tìm theo tên
    Optional<Amenity> findByName(String name);
    
    // Tìm theo category
    List<Amenity> findByCategory(AmenityCategory category);
    
    // Kiểm tra tồn tại theo tên
    boolean existsByName(String name);
    
    // Tìm tất cả và sắp xếp theo category
    List<Amenity> findAllByOrderByCategoryAsc();
}