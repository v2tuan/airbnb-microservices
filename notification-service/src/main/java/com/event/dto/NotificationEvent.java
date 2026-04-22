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
    String recipientEmail;
    String locale;           // vi, en
    Map<String, Object> payload;  // dynamic data: {username, orderId, otp...}
    Instant occurredAt;
}
