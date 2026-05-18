package com.bookingservice.repository;

import com.bookingservice.entity.Booking;
import feign.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    /**
     * Tìm booking theo roomId và khoảng thời gian (để check conflict)
     */
    @Query("SELECT b FROM Booking b WHERE b.listingId = :roomId " +
            "AND b.status IN ('PENDING_PAYMENT', 'PAID') " +
            "AND NOT (b.checkOutDate <= :checkIn OR b.checkInDate >= :checkOut)")
    List<Booking> findConflictingBookings(
            @Param("roomId") UUID roomId,
            @Param("checkIn") java.time.LocalDate checkIn,
            @Param("checkOut") java.time.LocalDate checkOut
    );
}
