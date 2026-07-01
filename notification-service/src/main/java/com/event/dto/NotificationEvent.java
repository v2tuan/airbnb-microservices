package com.event.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationEvent {
    String eventType;        // USER_REGISTERED, ORDER_CONFIRMED, OTP_REQUESTED...
    String channel;          // EMAIL, SMS, PUSH
    String recipientId;      // userId
    String recipientRole;    // GUEST, HOST, ADMIN
    String recipientEmail;
    String locale;           // vi, en
    String title;
    String message;
    Map<String, Object> meta;
    Map<String, Object> payload;  // dynamic data: {username, orderId, otp...}
    Instant occurredAt;
}
