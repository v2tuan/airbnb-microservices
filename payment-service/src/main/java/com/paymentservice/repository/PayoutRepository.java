package com.paymentservice.repository;

import com.paymentservice.entity.Payout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PayoutRepository extends JpaRepository<Payout, UUID> {
    List<Payout> findByHostId(UUID hostId);
    List<Payout> findByBookingId(UUID bookingId);
    List<Payout> findByStatus(String status);
    List<Payout> findByScheduledAtBefore(LocalDateTime dateTime);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT p FROM Payout p
            WHERE p.status IN ('PENDING_CHECKIN', 'SCHEDULED', 'RETRY')
            AND p.scheduledAt <= :now
            AND (p.nextRetryAt IS NULL OR p.nextRetryAt <= :now)
            """)
    List<Payout> findDueForProcessing(@Param("now") LocalDateTime now);
}
