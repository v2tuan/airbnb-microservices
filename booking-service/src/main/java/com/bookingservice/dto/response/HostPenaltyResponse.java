package com.bookingservice.dto.response;

import com.bookingservice.entity.HostCancellationReasonCode;
import com.bookingservice.entity.HostPenaltyStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class HostPenaltyResponse {
    private UUID penaltyId;
    private UUID bookingId;
    private UUID hostId;
    private UUID listingId;
    private HostCancellationReasonCode reasonCode;
    private Integer points;
    private HostPenaltyStatus status;
    private Boolean listingSuspensionTriggered;
    private Boolean hostAdminReviewTriggered;
    private LocalDateTime listingSuspendedUntil;
    private LocalDateTime createdAt;
    private LocalDateTime waivedAt;
    private String waiverReason;
}
