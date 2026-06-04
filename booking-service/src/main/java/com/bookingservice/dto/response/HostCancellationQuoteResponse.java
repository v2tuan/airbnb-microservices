package com.bookingservice.dto.response;

import com.bookingservice.entity.HostCancellationReasonCode;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class HostCancellationQuoteResponse {
    private UUID quoteId;
    private UUID bookingId;
    private HostCancellationReasonCode reasonCode;
    private BigDecimal guestRefundAmount;
    private String currency;
    private Integer penaltyPoints;
    private ThresholdResult thresholdResult;
    private LocalDateTime expiresAt;

    @Data
    @Builder
    public static class ThresholdResult {
        private Integer listingActivePenaltyCount;
        private Integer hostActivePenaltyCount;
        private Boolean willSuspendListing;
        private LocalDateTime listingSuspendedUntil;
        private Boolean willMarkHostAdminReview;
    }
}
