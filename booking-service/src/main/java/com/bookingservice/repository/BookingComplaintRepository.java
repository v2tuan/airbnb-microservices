package com.bookingservice.repository;

import com.bookingservice.entity.BookingComplaint;
import com.bookingservice.entity.ComplaintStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingComplaintRepository extends JpaRepository<BookingComplaint, UUID> {
    boolean existsByBookingIdAndStatusIn(UUID bookingId, Collection<ComplaintStatus> statuses);

    List<BookingComplaint> findByBookingIdOrderByCreatedAtDesc(UUID bookingId);

    List<BookingComplaint> findByGuestIdOrderByCreatedAtDesc(UUID guestId);

    List<BookingComplaint> findByHostIdOrderByCreatedAtDesc(UUID hostId);

    List<BookingComplaint> findByStatusAndHostResponseDeadlineBefore(
            ComplaintStatus status,
            LocalDateTime deadline
    );

    List<BookingComplaint> findByStatusInAndResolvedAtBefore(
            Collection<ComplaintStatus> statuses,
            LocalDateTime resolvedBefore
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM BookingComplaint c WHERE c.complaintId = :complaintId")
    Optional<BookingComplaint> findByIdForUpdate(@Param("complaintId") UUID complaintId);
}
