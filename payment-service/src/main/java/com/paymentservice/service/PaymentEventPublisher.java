package com.paymentservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentEventPublisher {
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.payment-succeeded:payment.succeeded}")
    private String paymentSucceededTopic;

    @Value("${kafka.topics.payout-completed:payout.completed}")
    private String payoutCompletedTopic;

    @Value("${kafka.topics.refund-completed:refund.completed}")
    private String refundCompletedTopic;

    public void paymentSucceeded(String key, Object event) {
        kafkaTemplate.send(paymentSucceededTopic, key, event)
                .whenComplete((result, ex) -> logSendResult(paymentSucceededTopic, key, ex));
    }

    public void payoutCompleted(String key, Object event) {
        kafkaTemplate.send(payoutCompletedTopic, key, event)
                .whenComplete((result, ex) -> logSendResult(payoutCompletedTopic, key, ex));
    }

    public void refundCompleted(String key, Object event) {
        kafkaTemplate.send(refundCompletedTopic, key, event)
                .whenComplete((result, ex) -> logSendResult(refundCompletedTopic, key, ex));
    }

    private void logSendResult(String topic, String key, Throwable ex) {
        if (ex != null) {
            log.error("Failed to publish event topic={} key={}", topic, key, ex);
        }
    }
}
