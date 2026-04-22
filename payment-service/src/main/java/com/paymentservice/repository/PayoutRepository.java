package com.paymentservice.repository;

import com.paymentservice.entity.Payout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PayoutRepository extends JpaRepository<Payout, UUID> {
    List<Payout> findByHostId(UUID hostId);
    List<Payout> findByBookingId(UUID bookingId);
    List<Payout> findByStatus(String status);
    List<Payout> findByScheduledAtBefore(LocalDateTime dateTime);
}
