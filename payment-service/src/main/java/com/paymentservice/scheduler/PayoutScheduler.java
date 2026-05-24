package com.paymentservice.scheduler;

import com.paymentservice.service.PayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PayoutScheduler {
    private final PayoutService payoutService;

    @Scheduled(fixedDelayString = "${payout.scheduler-delay-ms:60000}")
    public void processDuePayouts() {
        payoutService.processDuePayouts();
    }
}
