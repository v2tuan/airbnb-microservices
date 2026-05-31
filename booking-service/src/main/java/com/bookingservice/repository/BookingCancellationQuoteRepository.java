package com.bookingservice.repository;

import com.bookingservice.entity.BookingCancellationQuote;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BookingCancellationQuoteRepository extends JpaRepository<BookingCancellationQuote, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT q FROM BookingCancellationQuote q
            WHERE q.quoteId = :quoteId
            AND q.bookingId = :bookingId
            """)
    Optional<BookingCancellationQuote> findByQuoteIdAndBookingIdForUpdate(
            @Param("quoteId") UUID quoteId,
            @Param("bookingId") UUID bookingId
    );
}
