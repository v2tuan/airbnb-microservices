package com.bookingservice.repository;

import com.bookingservice.entity.Booking;
import com.bookingservice.entity.BookingStatus;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    /**
     * Tìm booking theo roomId và khoảng thời gian (để check conflict)
     */
    @Query("SELECT b FROM Booking b WHERE b.listingId = :roomId " +
            "AND b.status IN ('PENDING_PAYMENT', 'PAID', 'CHECKED_IN') " +
            "AND NOT (b.checkOutDate <= :checkIn OR b.checkInDate >= :checkOut)")
    List<Booking> findConflictingBookings(
            @Param("roomId") UUID roomId,
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut
    );

    /*
    lock theo transaction hiện tại
    auto release khi transaction commit/rollback
     */
    @Query(value = "SELECT pg_advisory_xact_lock(hashtext(:listingId))", nativeQuery = true)
    Object acquireListingBookingLock(@Param("listingId") String listingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.bookingId = :bookingId")
    java.util.Optional<Booking> findByIdForUpdate(@Param("bookingId") UUID bookingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT b FROM Booking b
            WHERE b.status = com.bookingservice.entity.BookingStatus.PENDING_PAYMENT
            AND b.expiresAt <= :now
            """)
    List<Booking> findExpiredPendingForUpdate(@Param("now") LocalDateTime now);

    List<Booking> findByGuestIdAndStatusIn(UUID guestId, List<BookingStatus> statuses);

    List<Booking> findByGuestId(UUID guestId);

    /**
     * Query list reservation theo một listing cho admin scope.
     * Sắp xếp check-in mới nhất trước, sau đó createdAt để host/admin dễ đọc lịch sử đặt phòng.
     */
    List<Booking> findByListingIdOrderByCheckInDateDescCreatedAtDesc(UUID listingId);

    /**
     * Query list reservation theo listing + status filter cho dashboard tab/filter.
     */
    List<Booking> findByListingIdAndStatusInOrderByCheckInDateDescCreatedAtDesc(
            UUID listingId,
            List<BookingStatus> statuses
    );

    /**
     * Query list reservation theo listing + hostId cho host scope.
     * Điều kiện hostId là lớp bảo vệ bổ sung bên cạnh phần kiểm quyền trong service.
     */
    List<Booking> findByListingIdAndHostIdOrderByCheckInDateDescCreatedAtDesc(UUID listingId, UUID hostId);

    /**
     * Query list reservation theo listing + hostId + status filter cho host dashboard.
     */
    List<Booking> findByListingIdAndHostIdAndStatusInOrderByCheckInDateDescCreatedAtDesc(
            UUID listingId,
            UUID hostId,
            List<BookingStatus> statuses
    );

    /**
     * Query reservation theo host cho scope "All listings".
     *
     * Đây là phần thay thế cho Promise.all ở frontend. Thay vì client gọi từng listing rồi tự
     * ghép kết quả, backend dùng hostId đã được xác thực để lấy đúng một tập reservation nhất quán.
     * Nếu bỏ query theo host và quay lại aggregate phía client, pagination/search sẽ chỉ đúng trong
     * từng listing riêng lẻ chứ không đúng trên toàn portfolio của host.
     */
    List<Booking> findByHostIdOrderByCheckInDateDescCreatedAtDesc(UUID hostId);

    @Query("""
    SELECT b FROM Booking b
    WHERE b.guestId = :guestId
    AND (
        :type = 'ALL'

        OR (
            :type = 'CANCELLED'
            AND (
                b.status = com.bookingservice.entity.BookingStatus.CANCELLED

                OR (
                    b.status = com.bookingservice.entity.BookingStatus.PENDING_PAYMENT
                    AND b.expiresAt < :now
                )

                OR (
                    b.status = BookingStatus.EXPIRED
                )
            )
        )

        OR (
            :type = 'UPCOMING'
            AND (
                (
                    b.status = com.bookingservice.entity.BookingStatus.PAID
                    AND b.checkOutDate >= CURRENT_DATE
                )

                OR (
                    b.status = com.bookingservice.entity.BookingStatus.PENDING_PAYMENT
                    AND b.expiresAt > :now
                )
            )
        )

        OR (
            :type = 'COMPLETED'
            AND b.status IN (
                com.bookingservice.entity.BookingStatus.PAID            )
            AND b.checkOutDate < CURRENT_DATE
        )
    )
    ORDER BY b.createdAt DESC
""")
    List<Booking> findBookingsByType(
            UUID guestId,
            String type,
            LocalDateTime now
    );
}
