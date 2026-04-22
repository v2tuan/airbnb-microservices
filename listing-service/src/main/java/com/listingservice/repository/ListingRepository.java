package com.listingservice.repository;

import com.listingservice.constant.ListingStatus;
import com.listingservice.entity.Listing;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface ListingRepository extends JpaRepository<Listing, UUID> {

    // Tim theo host
    List<Listing> findByHostId(String hostId);

    // Tim theo host va status
    List<Listing> findByHostIdAndStatus(String hostId, ListingStatus status);

    // Tim theo status
    List<Listing> findByStatus(ListingStatus status);

    // Tim theo city
    List<Listing> findByCity(String city);

    // Tim theo city va status cho section trang chu
    List<Listing> findByCityIgnoreCaseAndStatusOrderByInstantBookDescCreatedAtDesc(String city, ListingStatus status);

    // Fallback query cho section trang chu
    List<Listing> findByCityIgnoreCaseAndStatus(String city, ListingStatus status);

    // Tim theo city va country
    List<Listing> findByCityAndCountry(String city, String country);

    // Tim theo property type
    List<Listing> findByPropertyType(com.listingservice.constant.PropertyType propertyType);

    // Tim theo room type
    List<Listing> findByRoomType(com.listingservice.constant.RoomType roomType);

    // Tim listing co instant book
    List<Listing> findByInstantBookTrueAndStatus(ListingStatus status);

    // Tim theo so khach toi da
    List<Listing> findByMaxGuestsGreaterThanEqualAndStatus(Integer maxGuests, ListingStatus status);

    // Tim trong khoang gia (join voi pricing)
    @Query("SELECT l FROM Listing l JOIN l.pricing p WHERE p.basePrice BETWEEN :minPrice AND :maxPrice AND l.status = :status")
    List<Listing> findByPriceRangeAndStatus(
        @Param("minPrice") BigDecimal minPrice,
        @Param("maxPrice") BigDecimal maxPrice,
        @Param("status") ListingStatus status
    );

    // Tim theo coordinates (trong ban kinh)
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

    // Kiem tra listing ton tai theo ID va host
    boolean existsByListingIdAndHostId(UUID listingId, String hostId);

    // Dem so listing cua host
    long countByHostId(String hostId);

    // Dem so listing active cua host
    long countByHostIdAndStatus(String hostId, ListingStatus status);

    // Pagination cho host profile
    Page<Listing> findByHostIdAndStatus(String hostId, ListingStatus status, Pageable pageable);

    // Pagination cho host profile (khong loc status)
    Page<Listing> findByHostId(String hostId, Pageable pageable);
}