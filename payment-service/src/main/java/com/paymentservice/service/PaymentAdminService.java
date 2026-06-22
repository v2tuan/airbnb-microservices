package com.paymentservice.service;

import com.paymentservice.dto.response.AdminPaymentOverviewResponse;
import com.paymentservice.dto.response.AdminRefundRecordResponse;
import com.paymentservice.entity.Payment;
import com.paymentservice.entity.PaymentStatus;
import com.paymentservice.entity.Payout;
import com.paymentservice.entity.PayoutStatus;
import com.paymentservice.entity.Refund;
import com.paymentservice.entity.RefundStatus;
import com.paymentservice.entity.Transaction;
import com.paymentservice.repository.PaymentRepository;
import com.paymentservice.repository.PayoutRepository;
import com.paymentservice.repository.RefundRepository;
import com.paymentservice.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PaymentAdminService {
    private static final List<PayoutStatus> PENDING_PAYOUT_STATUSES = List.of(
            PayoutStatus.PENDING_CHECKIN,
            PayoutStatus.SCHEDULED,
            PayoutStatus.PROCESSING,
            PayoutStatus.RETRY
    );

    private final PaymentRepository paymentRepository;
    private final TransactionRepository transactionRepository;
    private final RefundRepository refundRepository;
    private final PayoutRepository payoutRepository;

    @Transactional(readOnly = true)
    public AdminPaymentOverviewResponse getOverview() {
        List<Payment> payments = paymentRepository.findAll();
        List<Transaction> transactions = transactionRepository.findAll();
        List<Refund> refunds = refundRepository.findAll();
        List<Payout> payouts = payoutRepository.findAll();

        String currency = resolveCurrency(payments, transactions, refunds, payouts);

        return AdminPaymentOverviewResponse.builder()
                .summary(buildSummary(payments, refunds, payouts, currency))
                .paymentFlow(buildPaymentFlow(payments, refunds, payouts))
                .transactionStatus(buildTransactionStatus(transactions))
                .payoutAging(buildPayoutAging(payouts))
                .queue(buildQueue(transactions, refunds, payouts))
                .build();
    }

    @Transactional(readOnly = true)
    public List<AdminRefundRecordResponse> getRefunds() {
        return refundRepository.findAll().stream()
                .sorted(Comparator.comparing(
                        Refund::getInitiatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .map(refund -> {
                    Transaction original = refund.getOriginalTransaction();
                    return AdminRefundRecordResponse.builder()
                            .refundId(refund.getRefundId())
                            .bookingId(original.getBookingId())
                            .paymentId(original.getTransactionId())
                            .guestId(original.getPayerId())
                            .amount(refund.getRefundAmount())
                            .currency(original.getCurrency())
                            .status(refund.getStatus().name())
                            .businessCause(refund.getBusinessCause().name())
                            .paymentStatus(original.getStatus())
                            .providerRefundId(refund.getGatewayRefundId())
                            .createdAt(refund.getInitiatedAt())
                            .updatedAt(refund.getCompletedAt())
                            .build();
                })
                .toList();
    }

    private AdminPaymentOverviewResponse.Summary buildSummary(
            List<Payment> payments,
            List<Refund> refunds,
            List<Payout> payouts,
            String currency
    ) {
        List<Payment> capturedPayments = payments.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.PAID)
                .toList();
        List<Refund> activeRefunds = refunds.stream()
                .filter(refund -> refund.getStatus() != RefundStatus.FAILED)
                .toList();
        List<Payout> pendingPayouts = payouts.stream()
                .filter(payout -> PENDING_PAYOUT_STATUSES.contains(payout.getStatus()))
                .toList();

        return AdminPaymentOverviewResponse.Summary.builder()
                .paymentCount(capturedPayments.size())
                .capturedAmount(capturedPayments.stream()
                        .map(payment -> toMajorAmount(payment.getAmount()))
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .refundCount(activeRefunds.size())
                .refundedAmount(activeRefunds.stream()
                        .map(Refund::getRefundAmount)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .pendingPayoutCount(pendingPayouts.size())
                .pendingPayoutAmount(pendingPayouts.stream()
                        .map(Payout::getHostEarnings)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add))
                .currency(currency)
                .build();
    }

    private List<AdminPaymentOverviewResponse.PaymentFlowPoint> buildPaymentFlow(
            List<Payment> payments,
            List<Refund> refunds,
            List<Payout> payouts
    ) {
        LocalDate today = LocalDate.now();
        Map<LocalDate, FlowAccumulator> byDate = new LinkedHashMap<>();
        for (int offset = 6; offset >= 0; offset--) {
            byDate.put(today.minusDays(offset), new FlowAccumulator());
        }

        payments.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.PAID)
                .forEach(payment -> {
                    LocalDate date = toDate(payment.getSucceededAt(), payment.getCreatedAt());
                    FlowAccumulator bucket = byDate.get(date);
                    if (bucket != null) {
                        bucket.captured = bucket.captured.add(toMajorAmount(payment.getAmount()));
                    }
                });

        refunds.stream()
                .filter(refund -> refund.getStatus() != RefundStatus.FAILED)
                .forEach(refund -> {
                    LocalDate date = toDate(refund.getCompletedAt(), refund.getInitiatedAt());
                    FlowAccumulator bucket = byDate.get(date);
                    if (bucket != null && refund.getRefundAmount() != null) {
                        bucket.refunded = bucket.refunded.add(refund.getRefundAmount());
                    }
                });

        payouts.stream()
                .filter(payout -> payout.getStatus() == PayoutStatus.COMPLETED)
                .forEach(payout -> {
                    LocalDate date = toDate(payout.getProcessedAt(), payout.getCreatedAt());
                    FlowAccumulator bucket = byDate.get(date);
                    if (bucket != null && payout.getHostEarnings() != null) {
                        bucket.payout = bucket.payout.add(payout.getHostEarnings());
                    }
                });

        return byDate.entrySet().stream()
                .map(entry -> AdminPaymentOverviewResponse.PaymentFlowPoint.builder()
                        .date(entry.getKey())
                        .captured(entry.getValue().captured)
                        .refunded(entry.getValue().refunded)
                        .payout(entry.getValue().payout)
                        .build())
                .toList();
    }

    private List<AdminPaymentOverviewResponse.StatusCount> buildTransactionStatus(List<Transaction> transactions) {
        return transactions.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        Transaction::getStatus,
                        LinkedHashMap::new,
                        java.util.stream.Collectors.counting()
                ))
                .entrySet()
                .stream()
                .map(entry -> AdminPaymentOverviewResponse.StatusCount.builder()
                        .status(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .toList();
    }

    private List<AdminPaymentOverviewResponse.PayoutAgingBucket> buildPayoutAging(List<Payout> payouts) {
        LocalDate today = LocalDate.now();
        Map<String, BigDecimal> buckets = new LinkedHashMap<>();
        buckets.put("0-1d", BigDecimal.ZERO);
        buckets.put("2-3d", BigDecimal.ZERO);
        buckets.put("4-7d", BigDecimal.ZERO);
        buckets.put("7d+", BigDecimal.ZERO);

        payouts.stream()
                .filter(payout -> PENDING_PAYOUT_STATUSES.contains(payout.getStatus()))
                .forEach(payout -> {
                    long age = ChronoUnit.DAYS.between(payout.getCreatedAt().toLocalDate(), today);
                    String bucket = age <= 1 ? "0-1d" : age <= 3 ? "2-3d" : age <= 7 ? "4-7d" : "7d+";
                    BigDecimal amount = payout.getHostEarnings() == null ? BigDecimal.ZERO : payout.getHostEarnings();
                    buckets.put(bucket, buckets.get(bucket).add(amount));
                });

        return buckets.entrySet().stream()
                .map(entry -> AdminPaymentOverviewResponse.PayoutAgingBucket.builder()
                        .bucket(entry.getKey())
                        .amount(entry.getValue())
                        .build())
                .toList();
    }

    private List<AdminPaymentOverviewResponse.PaymentQueueItem> buildQueue(
            List<Transaction> transactions,
            List<Refund> refunds,
            List<Payout> payouts
    ) {
        List<AdminPaymentOverviewResponse.PaymentQueueItem> transactionItems = transactions.stream()
                .filter(transaction -> !"COMPLETED".equalsIgnoreCase(transaction.getStatus()))
                .map(transaction -> AdminPaymentOverviewResponse.PaymentQueueItem.builder()
                        .id(transaction.getTransactionId())
                        .type(transaction.getTransactionType())
                        .bookingId(transaction.getBookingId())
                        .status(transaction.getStatus())
                        .amount(transaction.getAmount())
                        .currency(transaction.getCurrency())
                        .owner("payment-service")
                        .createdAt(transaction.getInitiatedAt())
                        .build())
                .toList();

        List<AdminPaymentOverviewResponse.PaymentQueueItem> refundItems = refunds.stream()
                .filter(refund -> refund.getStatus() == RefundStatus.PENDING || refund.getStatus() == RefundStatus.PROCESSING)
                .map(refund -> AdminPaymentOverviewResponse.PaymentQueueItem.builder()
                        .id(refund.getRefundId())
                        .type("REFUND")
                        .bookingId(refund.getOriginalTransaction().getBookingId())
                        .status(refund.getStatus().name())
                        .amount(refund.getRefundAmount())
                        .currency(refund.getOriginalTransaction().getCurrency())
                        .owner("payment-service")
                        .createdAt(refund.getInitiatedAt())
                        .build())
                .toList();

        List<AdminPaymentOverviewResponse.PaymentQueueItem> payoutItems = payouts.stream()
                .filter(payout -> PENDING_PAYOUT_STATUSES.contains(payout.getStatus()))
                .map(payout -> AdminPaymentOverviewResponse.PaymentQueueItem.builder()
                        .id(payout.getPayoutId())
                        .type("PAYOUT")
                        .bookingId(payout.getBookingId())
                        .status(payout.getStatus().name())
                        .amount(payout.getHostEarnings())
                        .currency(payout.getCurrency())
                        .owner("payment-service")
                        .createdAt(payout.getCreatedAt())
                        .build())
                .toList();

        return java.util.stream.Stream.of(transactionItems, refundItems, payoutItems)
                .flatMap(List::stream)
                .sorted(Comparator.comparing(
                        AdminPaymentOverviewResponse.PaymentQueueItem::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .limit(25)
                .toList();
    }

    private String resolveCurrency(
            List<Payment> payments,
            List<Transaction> transactions,
            List<Refund> refunds,
            List<Payout> payouts
    ) {
        return payments.stream().map(Payment::getCurrency).filter(Objects::nonNull).findFirst()
                .or(() -> transactions.stream().map(Transaction::getCurrency).filter(Objects::nonNull).findFirst())
                .or(() -> refunds.stream()
                        .map(Refund::getOriginalTransaction)
                        .filter(Objects::nonNull)
                        .map(Transaction::getCurrency)
                        .filter(Objects::nonNull)
                        .findFirst())
                .or(() -> payouts.stream().map(Payout::getCurrency).filter(Objects::nonNull).findFirst())
                .orElse("USD")
                .toUpperCase();
    }

    private LocalDate toDate(LocalDateTime preferred, LocalDateTime fallback) {
        LocalDateTime value = preferred != null ? preferred : fallback;
        return value == null ? null : value.toLocalDate();
    }

    private BigDecimal toMajorAmount(Long amount) {
        return amount == null ? BigDecimal.ZERO : BigDecimal.valueOf(amount);
    }

    private static class FlowAccumulator {
        private BigDecimal captured = BigDecimal.ZERO;
        private BigDecimal refunded = BigDecimal.ZERO;
        private BigDecimal payout = BigDecimal.ZERO;
    }
}
