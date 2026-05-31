package com.bookingservice.service;

import com.bookingservice.entity.Booking;
import com.bookingservice.entity.HostCancellationQuote;
import com.bookingservice.entity.HostPenalty;
import com.bookingservice.entity.HostPenaltyStatus;
import com.bookingservice.repository.HostPenaltyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class HostPenaltyService {
    private final HostPenaltyRepository hostPenaltyRepository;

    public ThresholdPreview previewThresholds(Booking booking, LocalDateTime now) {
        int listingCount = (int) hostPenaltyRepository.countByListingIdAndStatusAndCreatedAtAfter(
                booking.getListingId(),
                HostPenaltyStatus.ACTIVE,
                now.minusDays(90)
        ) + 1;
        int hostCount = (int) hostPenaltyRepository.countByHostIdAndStatusAndCreatedAtAfter(
                booking.getHostId(),
                HostPenaltyStatus.ACTIVE,
                now.minusDays(180)
        ) + 1;
        boolean willSuspendListing = listingCount >= 3;
        boolean willMarkHostAdminReview = hostCount >= 5;

        return new ThresholdPreview(
                listingCount,
                hostCount,
                willSuspendListing,
                willSuspendListing ? now.plusDays(7) : null,
                willMarkHostAdminReview
        );
    }

    @Transactional
    public HostPenalty createActivePenalty(Booking booking, HostCancellationQuote quote) {
        HostPenalty penalty = HostPenalty.builder()
                .bookingId(booking.getBookingId())
                .hostId(booking.getHostId())
                .listingId(booking.getListingId())
                .reasonCode(quote.getReasonCode())
                .points(quote.getPenaltyPoints())
                .status(HostPenaltyStatus.ACTIVE)
                .listingSuspensionTriggered(quote.getWillSuspendListing())
                .hostAdminReviewTriggered(quote.getWillMarkHostAdminReview())
                .listingSuspendedUntil(quote.getListingSuspendedUntil())
                .build();
        return hostPenaltyRepository.save(penalty);
    }

    public record ThresholdPreview(
            int listingActivePenaltyCount,
            int hostActivePenaltyCount,
            boolean willSuspendListing,
            LocalDateTime listingSuspendedUntil,
            boolean willMarkHostAdminReview
    ) {
    }
}
