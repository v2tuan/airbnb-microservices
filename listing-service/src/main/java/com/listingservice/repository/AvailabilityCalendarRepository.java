package com.listingservice.repository;

import com.listingservice.entity.AvailabilityCalendar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AvailabilityCalendarRepository extends JpaRepository<AvailabilityCalendar, UUID> {
    
    // Tìm theo listing và ngày
    Optional<AvailabilityCalendar> findByListingListingIdAndDate(UUID listingId, LocalDate date);
    
    // Tìm trong khoảng thời gian
    List<AvailabilityCalendar> findByListingListingIdAndDateBetween(UUID listingId, LocalDate startDate, LocalDate endDate);
    
    // Tìm các ngày available trong khoảng thời gian
    List<AvailabilityCalendar> findByListingListingIdAndDateBetweenAndIsAvailableTrue(
        UUID listingId, LocalDate startDate, LocalDate endDate
    );
    
    // Kiểm tra listing có available trong khoảng thời gian không
    @Query("SELECT COUNT(ac) > 0 FROM AvailabilityCalendar ac WHERE ac.listing.listingId = :listingId " +
           "AND ac.date BETWEEN :startDate AND :endDate AND ac.isAvailable = true")
    boolean isListingAvailableInDateRange(
        @Param("listingId") UUID listingId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    // Kiểm tra tất cả các ngày trong khoảng thời gian có available không
    @Query("SELECT COUNT(ac) = :numberOfDays FROM AvailabilityCalendar ac WHERE ac.listing.listingId = :listingId " +
           "AND ac.date BETWEEN :startDate AND :endDate AND ac.isAvailable = true")
    boolean areAllDatesAvailable(
        @Param("listingId") UUID listingId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        @Param("numberOfDays") long numberOfDays
    );

    @Query("SELECT COUNT(ac) > 0 FROM AvailabilityCalendar ac WHERE ac.listing.listingId = :listingId " +
           "AND ac.date BETWEEN :startDate AND :endDate AND ac.isAvailable = false")
    boolean hasBlockedDateInRange(
        @Param("listingId") UUID listingId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    // Xóa theo listing
    void deleteByListingListingId(UUID listingId);
    
    // Xóa theo listing và ngày
    void deleteByListingListingIdAndDate(UUID listingId, LocalDate date);
}
