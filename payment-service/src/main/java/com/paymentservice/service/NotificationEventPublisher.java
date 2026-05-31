package com.paymentservice.service;

import com.paymentservice.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventPublisher {
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.notifications:notifications}")
    private String notificationsTopic;

    public void publish(String eventType, UUID recipientId, String recipientRole, Map<String, Object> payload) {
        NotificationEvent event = new NotificationEvent(
                eventType,
                "IN_APP",
                recipientId != null ? recipientId.toString() : null,
                recipientRole,
                payload != null ? payload : Map.of(),
                Instant.now()
        );
        try {
            kafkaTemplate.send(notificationsTopic, eventType + ":" + (recipientId != null ? recipientId : recipientRole), event)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.warn("Failed to publish notification eventType={} recipient={}",
                                    eventType, recipientId, ex);
                        }
                    });
        } catch (Exception ex) {
            log.warn("Failed to enqueue notification eventType={} recipient={}", eventType, recipientId, ex);
        }
    }

    public void publishToRole(String eventType, String role, Map<String, Object> payload) {
        publish(eventType, (UUID) null, role, payload);
    }
}
