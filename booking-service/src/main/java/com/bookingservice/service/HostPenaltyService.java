package com.bookingservice.service;

import com.bookingservice.entity.Booking;
import com.bookingservice.entity.HostCancellationQuote;
import com.bookingservice.entity.HostPenalty;
import com.bookingservice.entity.HostPenaltyStatus;
import com.bookingservice.dto.response.HostPenaltyResponse;
import com.bookingservice.exception.BusinessException;
import com.bookingservice.repository.HostPenaltyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HostPenaltyService {
    private final HostPenaltyRepository hostPenaltyRepository;
    private final NotificationEventPublisher notificationEventPublisher;

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
        HostPenalty saved = hostPenaltyRepository.save(penalty);
        publishPenaltyEvent("HOST_PENALTY_CREATED", saved);
        return saved;
    }

    @Transactional
    public HostPenaltyResponse waivePenalty(UUID penaltyId, String reason) {
        requireAdmin();
        HostPenalty penalty = hostPenaltyRepository.findById(penaltyId)
                .orElseThrow(() -> BusinessException.notFound("Host penalty not found"));
        if (penalty.getStatus() != HostPenaltyStatus.ACTIVE) {
            throw BusinessException.conflict("Only active penalties can be waived");
        }
        penalty.setStatus(HostPenaltyStatus.WAIVED);
        penalty.setWaivedAt(LocalDateTime.now());
        penalty.setWaiverReason(reason);
        HostPenalty saved = hostPenaltyRepository.save(penalty);
        publishPenaltyEvent("HOST_PENALTY_WAIVED", saved);
        return mapToResponse(saved);
    }

    private void publishPenaltyEvent(String eventType, HostPenalty penalty) {
        notificationEventPublisher.publish(
                eventType,
                penalty.getHostId(),
                "HOST",
                Map.of(
                        "penaltyId", penalty.getPenaltyId().toString(),
                        "bookingId", penalty.getBookingId().toString(),
                        "listingId", penalty.getListingId().toString(),
                        "status", penalty.getStatus().name(),
                        "points", penalty.getPoints()
                )
        );
    }

    private HostPenaltyResponse mapToResponse(HostPenalty penalty) {
        return HostPenaltyResponse.builder()
                .penaltyId(penalty.getPenaltyId())
                .bookingId(penalty.getBookingId())
                .hostId(penalty.getHostId())
                .listingId(penalty.getListingId())
                .reasonCode(penalty.getReasonCode())
                .points(penalty.getPoints())
                .status(penalty.getStatus())
                .listingSuspensionTriggered(penalty.getListingSuspensionTriggered())
                .hostAdminReviewTriggered(penalty.getHostAdminReviewTriggered())
                .listingSuspendedUntil(penalty.getListingSuspendedUntil())
                .createdAt(penalty.getCreatedAt())
                .waivedAt(penalty.getWaivedAt())
                .waiverReason(penalty.getWaiverReason())
                .build();
    }

    private void requireAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Jwt jwt = (Jwt) authentication.getPrincipal();
        Object realmAccess = jwt.getClaims().get("realm_access");
        if (!(realmAccess instanceof Map<?, ?> realmAccessMap)) {
            throw BusinessException.forbidden("Admin role is required");
        }
        Object roles = realmAccessMap.get("roles");
        if (!(roles instanceof Collection<?> roleCollection) || roleCollection.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .noneMatch(role -> role.equals("ADMIN") || role.equals("ROLE_ADMIN"))) {
            throw BusinessException.forbidden("Admin role is required");
        }
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
