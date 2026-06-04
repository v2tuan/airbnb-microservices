package com.bookingservice.repository;

import com.bookingservice.entity.HostCancellationQuote;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface HostCancellationQuoteRepository extends JpaRepository<HostCancellationQuote, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT q FROM HostCancellationQuote q
            WHERE q.quoteId = :quoteId
            AND q.bookingId = :bookingId
            """)
    Optional<HostCancellationQuote> findByQuoteIdAndBookingIdForUpdate(
            @Param("quoteId") UUID quoteId,
            @Param("bookingId") UUID bookingId
    );
}
