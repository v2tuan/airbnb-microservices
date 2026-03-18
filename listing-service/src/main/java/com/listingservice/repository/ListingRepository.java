package com.listingservice.repository;

import com.listingservice.constant.ListingStatus;
import com.listingservice.entity.Listing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface ListingRepository extends JpaRepository<Listing, UUID> {
    
    // Tìm theo host
    List<Listing> findByHostId(UUID hostId);
    
    // Tìm theo host và status
    List<Listing> findByHostIdAndStatus(UUID hostId, ListingStatus status);
    
    // Tìm theo status
    List<Listing> findByStatus(ListingStatus status);
    
    // Tìm theo city
    List<Listing> findByCity(String city);

    // Tìm theo city và status cho section trang chủ
    List<Listing> findByCityIgnoreCaseAndStatusOrderByInstantBookDescCreatedAtDesc(String city, ListingStatus status);

    // Tìm theo city và country
    List<Listing> findByCityAndCountry(String city, String country);
    
    // Tìm theo property type
    List<Listing> findByPropertyType(com.listingservice.constant.PropertyType propertyType);
    
    // Tìm theo room type
    List<Listing> findByRoomType(com.listingservice.constant.RoomType roomType);
    
    // Tìm listing có instant book
    List<Listing> findByInstantBookTrueAndStatus(ListingStatus status);
    
    // Tìm theo số khách tối đa
    List<Listing> findByMaxGuestsGreaterThanEqualAndStatus(Integer maxGuests, ListingStatus status);
    
    // Tìm trong khoảng giá (join với pricing)
    @Query("SELECT l FROM Listing l JOIN l.pricing p WHERE p.basePrice BETWEEN :minPrice AND :maxPrice AND l.status = :status")
    List<Listing> findByPriceRangeAndStatus(
        @Param("minPrice") BigDecimal minPrice, 
        @Param("maxPrice") BigDecimal maxPrice,
        @Param("status") ListingStatus status
    );
    
    // Tìm theo coordinates (trong bán kính)
    @Query("SELECT l FROM Listing l WHERE l.status = :status AND " +
           "(6371 * acos(cos(radians(:latitude)) * cos(radians(l.latitude)) * " +
           "cos(radians(l.longitude) - radians(:longitude)) + " +
           "sin(radians(:latitude)) * sin(radians(l.latitude)))) <= :radius")
    List<Listing> findByLocationWithinRadius(
        @Param("latitude") BigDecimal latitude,
        @Param("longitude") BigDecimal longitude,
        @Param("radius") Double radius,
        @Param("status") ListingStatus status
    );
    
    // Kiểm tra listing tồn tại theo ID và host
    boolean existsByListingIdAndHostId(UUID listingId, UUID hostId);
    
    // Đếm số listing của host
    long countByHostId(UUID hostId);
    
    // Đếm số listing active của host
    long countByHostIdAndStatus(UUID hostId, ListingStatus status);
}