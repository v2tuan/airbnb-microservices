package com.listingservice.repository;

import com.listingservice.constant.ListingStatus;
import com.listingservice.dto.response.HomeListingCardResponse;
import com.listingservice.dto.response.ListingItemResponse;
import com.listingservice.entity.Listing;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ListingRepository extends JpaRepository<Listing, UUID> {

    @Override
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules", "listingAmenities", "listingAmenities.amenity", "accessInfo", "accessInfo.checkInGuide"})
    Optional<Listing> findById(UUID listingId);

    @Override
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
    List<Listing> findAll();

    // Tim theo host
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
    List<Listing> findByHostId(String hostId);

    // Tim theo host va status
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
    List<Listing> findByHostIdAndStatus(String hostId, ListingStatus status);

    // Tim theo status
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
    List<Listing> findByStatus(ListingStatus status);

    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
    @Query("""
        SELECT l FROM Listing l
        WHERE l.status = :status
        AND (:city IS NULL OR :city = '' OR LOWER(l.city) = LOWER(:city))
        AND (:country IS NULL OR :country = '' OR LOWER(l.country) = LOWER(:country))
        AND (:maxGuests IS NULL OR l.maxGuests >= :maxGuests)
        """)
    List<Listing> searchActiveListings(
        @Param("status") ListingStatus status,
        @Param("city") String city,
        @Param("country") String country,
        @Param("maxGuests") Integer maxGuests
    );

    // Tim theo city
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
    List<Listing> findByCity(String city);

    // Tim theo city va status cho section trang chu
    List<Listing> findByCityIgnoreCaseAndStatusOrderByInstantBookDescCreatedAtDesc(String city, ListingStatus status);

    @Query("""
            SELECT new com.listingservice.dto.response.HomeListingCardResponse(
                l.listingId,
                l.title,
                l.city,
                l.country,
                (
                    SELECT p.photoUrl
                    FROM ListingPhoto p
                    WHERE p.listing = l
                    ORDER BY
                        CASE WHEN p.isCover = true THEN 0 ELSE 1 END,
                        p.displayOrder ASC
                    LIMIT 1
                ),
                pr.basePrice,
                null,
                pr.currency,
                l.maxGuests,
                l.instantBook
            )
            FROM Listing l
            LEFT JOIN l.pricing pr
            WHERE LOWER(l.city) = LOWER(:city)
              AND l.status = :status
            ORDER BY l.instantBook DESC, l.createdAt DESC
            """)
    List<HomeListingCardResponse> findHomeCardsByCity(
            @Param("city") String city,
            @Param("status") ListingStatus status,
            Pageable pageable
    );

    // Fallback query cho section trang chu
    List<Listing> findByCityIgnoreCaseAndStatus(String city, ListingStatus status);

    // Tim theo city va country
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
    List<Listing> findByCityAndCountry(String city, String country);

    // Tim theo property type
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
    List<Listing> findByPropertyType(com.listingservice.constant.PropertyType propertyType);

    // Tim theo room type
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
    List<Listing> findByRoomType(com.listingservice.constant.RoomType roomType);

    // Tim listing co instant book
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
    List<Listing> findByInstantBookTrueAndStatus(ListingStatus status);

    // Tim theo so khach toi da
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
    List<Listing> findByMaxGuestsGreaterThanEqualAndStatus(Integer maxGuests, ListingStatus status);

    // Tim trong khoang gia (join voi pricing)
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
    @Query("SELECT l FROM Listing l JOIN l.pricing p WHERE p.basePrice BETWEEN :minPrice AND :maxPrice AND l.status = :status")
    List<Listing> findByPriceRangeAndStatus(
        @Param("minPrice") BigDecimal minPrice,
        @Param("maxPrice") BigDecimal maxPrice,
        @Param("status") ListingStatus status
    );

    // Tim theo coordinates (trong ban kinh)
    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules"})
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

    @Query(
            value = """
                    SELECT new com.listingservice.dto.response.ListingItemResponse(
                        l.listingId,
                        l.title,
                        (
                            SELECT p.photoUrl
                            FROM ListingPhoto p
                            WHERE p.listing = l
                            ORDER BY
                                CASE WHEN p.isCover = true THEN 0 ELSE 1 END,
                                p.displayOrder ASC
                            LIMIT 1
                        ),
                        l.city,
                        l.country,
                        l.propertyType,
                        l.status,
                        l.createdAt,
                        null,
                        null,
                        null
                    )
                    FROM Listing l
                    WHERE l.hostId = :hostId
                    """,
            countQuery = "SELECT COUNT(l) FROM Listing l WHERE l.hostId = :hostId"
    )
    Page<ListingItemResponse> findHostListingItems(
            @Param("hostId") String hostId,
            Pageable pageable
    );

    @Query(
            value = """
                    SELECT new com.listingservice.dto.response.ListingItemResponse(
                        l.listingId,
                        l.title,
                        (
                            SELECT p.photoUrl
                            FROM ListingPhoto p
                            WHERE p.listing = l
                            ORDER BY
                                CASE WHEN p.isCover = true THEN 0 ELSE 1 END,
                                p.displayOrder ASC
                            LIMIT 1
                        ),
                        l.city,
                        l.country,
                        l.propertyType,
                        l.status,
                        l.createdAt,
                        null,
                        null,
                        null
                    )
                    FROM Listing l
                    WHERE l.hostId = :hostId
                      AND l.status = :status
                    """,
            countQuery = "SELECT COUNT(l) FROM Listing l WHERE l.hostId = :hostId AND l.status = :status"
    )
    Page<ListingItemResponse> findHostListingItemsByStatus(
            @Param("hostId") String hostId,
            @Param("status") ListingStatus status,
            Pageable pageable
    );

    @Query(
            value = """
                    SELECT new com.listingservice.dto.response.ListingItemResponse(
                        l.listingId,
                        l.title,
                        (
                            SELECT p.photoUrl
                            FROM ListingPhoto p
                            WHERE p.listing = l
                            ORDER BY
                                CASE WHEN p.isCover = true THEN 0 ELSE 1 END,
                                p.displayOrder ASC
                            LIMIT 1
                        ),
                        l.city,
                        l.country,
                        l.propertyType,
                        l.status,
                        l.createdAt,
                        null,
                        null,
                        null
                    )
                    FROM Listing l
                    WHERE l.hostId = :hostId
                      AND (:status IS NULL OR l.status = :status)
                      AND (LOWER(l.title) LIKE :pattern OR LOWER(l.city) LIKE :pattern)
                    """,
            countQuery = """
                    SELECT COUNT(l)
                    FROM Listing l
                    WHERE l.hostId = :hostId
                      AND (:status IS NULL OR l.status = :status)
                      AND (LOWER(l.title) LIKE :pattern OR LOWER(l.city) LIKE :pattern)
                    """
    )
    Page<ListingItemResponse> findHostListingItemsByKeyword(
            @Param("hostId") String hostId,
            @Param("status") ListingStatus status,
            @Param("pattern") String pattern,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"photos", "pricing", "houseRules", "listingAmenities", "listingAmenities.amenity", "accessInfo", "accessInfo.checkInGuide"})
    List<Listing> findByListingIdIn(List<UUID> ids);
}
