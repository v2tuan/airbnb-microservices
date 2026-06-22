package com.paymentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPaymentOverviewResponse {
    private Summary summary;
    private List<PaymentFlowPoint> paymentFlow;
    private List<StatusCount> transactionStatus;
    private List<PayoutAgingBucket> payoutAging;
    private List<PaymentQueueItem> queue;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private long paymentCount;
        private BigDecimal capturedAmount;
        private long refundCount;
        private BigDecimal refundedAmount;
        private long pendingPayoutCount;
        private BigDecimal pendingPayoutAmount;
        private String currency;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentFlowPoint {
        private LocalDate date;
        private BigDecimal captured;
        private BigDecimal refunded;
        private BigDecimal payout;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusCount {
        private String status;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayoutAgingBucket {
        private String bucket;
        private BigDecimal amount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentQueueItem {
        private UUID id;
        private String type;
        private UUID bookingId;
        private String status;
        private BigDecimal amount;
        private String currency;
        private String owner;
        private LocalDateTime createdAt;
    }
}
