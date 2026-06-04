package com.bookingservice.repository;

import com.bookingservice.entity.HostPenalty;
import com.bookingservice.entity.HostPenaltyStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.UUID;

public interface HostPenaltyRepository extends JpaRepository<HostPenalty, UUID> {
    long countByListingIdAndStatusAndCreatedAtAfter(UUID listingId, HostPenaltyStatus status, LocalDateTime createdAfter);

    long countByHostIdAndStatusAndCreatedAtAfter(UUID hostId, HostPenaltyStatus status, LocalDateTime createdAfter);
}
