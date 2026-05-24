package com.paymentservice.scheduler;

import com.paymentservice.service.PaymentReconciliationService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "payment.reconciliation.enabled", havingValue = "true")
public class PaymentReconciliationScheduler {
    private final PaymentReconciliationService reconciliationService;

    @Scheduled(fixedDelayString = "${payment.reconciliation.delay-ms:3600000}")
    public void reconcile() {
        reconciliationService.reconcilePaymentIntents();
    }
}
