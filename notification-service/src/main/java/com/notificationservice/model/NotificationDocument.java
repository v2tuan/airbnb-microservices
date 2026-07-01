package com.notificationservice.model;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Document("notifications")
public class NotificationDocument {
    @Id
    String id;
    String userId;
    String type;
    String title;
    String message;
    Map<String, Object> meta;
    Boolean read;
    Instant createdAt;
    Instant updatedAt;
}
