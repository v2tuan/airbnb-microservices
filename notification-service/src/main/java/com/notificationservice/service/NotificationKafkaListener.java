package com.notificationservice.service;

import com.event.dto.NotificationEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notificationservice.model.NotificationDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationKafkaListener {
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;

    @KafkaListener(topics = "${notification.kafka.topic:notification.events}")
    public void handle(byte[] message) {
        try {
            NotificationEvent event = objectMapper.readValue(message, NotificationEvent.class);
            if (event.getRecipientId() == null || event.getRecipientId().isBlank()) {
                return;
            }

            NotificationDocument saved = notificationService.saveEvent(event);
            log.info("Notification stored for user={} type={} id={}", saved.getUserId(), saved.getType(), saved.getId());
        } catch (Exception ex) {
            log.warn("Failed to process notification kafka event", ex);
        }
    }
}
