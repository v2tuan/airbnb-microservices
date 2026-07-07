package com.bookingservice.service;

import com.bookingservice.event.NotificationEvent;
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
    private static final String DEFAULT_CHANNEL = "IN_APP";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.notifications:notification.events}")
    private String notificationsTopic;

    public void publish(String eventType, UUID recipientId, String recipientRole, Map<String, Object> payload) {
        dispatch(eventType, recipientId != null ? recipientId.toString() : null, recipientRole, null, null, null, payload);
    }

    public void publish(String eventType, String recipientId, String recipientRole, Map<String, Object> payload) {
        dispatch(eventType, recipientId, recipientRole, null, null, null, payload);
    }

    public void publish(
            String eventType,
            String recipientId,
            String recipientRole,
            String title,
            String message,
            Map<String, Object> meta,
            Map<String, Object> payload
    ) {
        dispatch(eventType, recipientId, recipientRole, title, message, meta, payload);
    }

    public void publishToRole(String eventType, String recipientRole, Map<String, Object> payload) {
        dispatch(eventType, (String) null, recipientRole, null, null, null, payload);
    }

    private void dispatch(
            String eventType,
            String recipientId,
            String recipientRole,
            String title,
            String message,
            Map<String, Object> meta,
            Map<String, Object> payload
    ) {
        NotificationEvent event = new NotificationEvent(
                eventType,
                DEFAULT_CHANNEL,
                recipientId,
                recipientRole,
                title,
                message,
                meta != null ? meta : Map.of(),
                payload != null ? payload : Map.of(),
                Instant.now()
        );

        try {
            kafkaTemplate.send(notificationsTopic, eventType + ":" + (recipientId != null ? recipientId : recipientRole), event)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.warn("Failed to publish notification eventType={} recipientId={} role={}",
                                    eventType, recipientId, recipientRole, ex);
                        }
                    });
        } catch (RuntimeException ex) {
            log.warn("Failed to enqueue notification eventType={} recipientId={} role={}",
                    eventType, recipientId, recipientRole, ex);
        }
    }
}
