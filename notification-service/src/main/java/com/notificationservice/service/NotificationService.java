package com.notificationservice.service;

import com.event.dto.NotificationEvent;
import com.notificationservice.dto.NotificationResponse;
import com.notificationservice.model.NotificationDocument;
import com.notificationservice.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;

    @Transactional
    public NotificationDocument saveEvent(NotificationEvent event) {
        Map<String, Object> payload = event.getPayload() == null ? Map.of() : event.getPayload();
        Map<String, Object> meta = mergeMeta(event.getEventType(), event.getMeta(), payload, event.getRecipientRole());
        NotificationDocument document = NotificationDocument.builder()
                .userId(event.getRecipientId())
                .type(event.getEventType())
                .title(resolveTitle(event.getEventType(), event.getTitle(), payload))
                .message(resolveMessage(event.getEventType(), event.getMessage(), payload))
                .meta(meta)
                .read(false)
                .createdAt(event.getOccurredAt() == null ? Instant.now() : event.getOccurredAt())
                .updatedAt(Instant.now())
                .build();

        return notificationRepository.save(document);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(String userId, boolean unreadOnly, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        var pageable = PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt"));
        var page = unreadOnly
                ? notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId, pageable)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);

        return page.getContent().stream().map(this::toResponse).toList();
    }

    @Transactional
    public void markAllAsRead(String userId) {
        var unread = notificationRepository.findUnreadByUserId(userId);
        unread.forEach(item -> {
            item.setRead(true);
            item.setUpdatedAt(Instant.now());
        });
        notificationRepository.saveAll(unread);
    }

    @Transactional
    public void markAsRead(String userId, String notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            if (userId.equals(notification.getUserId())) {
                notification.setRead(true);
                notification.setUpdatedAt(Instant.now());
                notificationRepository.save(notification);
            }
        });
    }

    private NotificationResponse toResponse(NotificationDocument document) {
        return NotificationResponse.builder()
                .id(document.getId())
                .type(document.getType())
                .title(document.getTitle())
                .message(document.getMessage())
                .meta(document.getMeta())
                .read(Boolean.TRUE.equals(document.getRead()))
                .createdAt(document.getCreatedAt())
                .build();
    }

    private Map<String, Object> mergeMeta(
            String eventType,
            Map<String, Object> meta,
            Map<String, Object> payload,
            String recipientRole
    ) {
        Map<String, Object> merged = new LinkedHashMap<>();
        if (payload != null) {
            merged.putAll(payload);
        }
        if (meta != null) {
            merged.putAll(meta);
        }
        String href = resolveHref(eventType, merged, recipientRole);
        if (href != null && !href.isBlank()) {
            merged.putIfAbsent("href", href);
        }
        return merged;
    }

    private String resolveTitle(String eventType, String explicitTitle, Map<String, Object> payload) {
        if (explicitTitle != null && !explicitTitle.isBlank()) {
            return explicitTitle;
        }

        return switch (eventType == null ? "" : eventType) {
            case "MESSAGE" -> "New message";
            case "BOOKING_REQUEST_CREATED" -> "Booking request created";
            case "BOOKING_CONFIRMED" -> "Booking confirmed";
            case "BOOKING_EXPIRED" -> "Booking expired";
            case "BOOKING_CHECKED_IN" -> "Guest checked in";
            case "BOOKING_CHECKED_OUT" -> "Guest checked out";
            case "BOOKING_COMPLETED" -> "Booking completed";
            case "BOOKING_CANCELLED_BY_GUEST" -> "Guest cancelled booking";
            case "BOOKING_CANCELLED_BY_HOST" -> "Host cancelled booking";
            case "BOOKING_CANCELLED_BY_ADMIN" -> "Booking cancelled by admin";
            case "REFUND_CREATED" -> "Refund created";
            case "LISTING_SUSPENDED" -> "Listing suspended";
            default -> "Notification";
        };
    }

    private String resolveMessage(String eventType, String explicitMessage, Map<String, Object> payload) {
        if (explicitMessage != null && !explicitMessage.isBlank()) {
            return explicitMessage;
        }

        String bookingId = stringValue(payload.get("bookingId"));
        String listingId = stringValue(payload.get("listingId"));
        String currency = stringValue(payload.get("currency"));
        String totalAmount = moneyValue(payload.get("totalAmount"));
        String refundAmount = moneyValue(payload.get("refundAmount"));
        String checkInDate = stringValue(payload.get("checkInDate"));
        String checkOutDate = stringValue(payload.get("checkOutDate"));

        return switch (eventType == null ? "" : eventType) {
            case "MESSAGE" -> "You have a new conversation update.";
            case "BOOKING_REQUEST_CREATED" ->
                    "A booking request was created for listing " + shortRef(listingId) + ".";
            case "BOOKING_CONFIRMED" ->
                    "Your booking " + shortRef(bookingId) + " has been confirmed.";
            case "BOOKING_EXPIRED" ->
                    "A booking request has expired.";
            case "BOOKING_CHECKED_IN" ->
                    "Check-in has been recorded for " + shortRef(bookingId) + ".";
            case "BOOKING_CHECKED_OUT" ->
                    "Check-out has been recorded for " + shortRef(bookingId) + ".";
            case "BOOKING_COMPLETED" ->
                    "Your stay has been completed.";
            case "BOOKING_CANCELLED_BY_GUEST" ->
                    "A guest cancelled booking " + shortRef(bookingId) + ".";
            case "BOOKING_CANCELLED_BY_HOST" ->
                    "A host cancelled booking " + shortRef(bookingId) + ".";
            case "BOOKING_CANCELLED_BY_ADMIN" ->
                    "A booking was cancelled by admin.";
            case "REFUND_CREATED" ->
                    "Refund " + (refundAmount != null ? refundAmount : "") + suffixCurrency(currency) + " was created.";
            case "LISTING_SUSPENDED" ->
                    "Listing " + shortRef(listingId) + " was suspended.";
            default -> {
                if (bookingId != null || listingId != null) {
                    yield "Booking " + shortRef(bookingId) + " / listing " + shortRef(listingId) + " was updated.";
                }
                yield "You have a new notification.";
            }
        };
    }

    private String resolveHref(String eventType, Map<String, Object> data, String recipientRole) {
        String bookingId = stringValue(data.get("bookingId"));
        String listingId = stringValue(data.get("listingId"));
        String conversationId = stringValue(data.get("conversationId"));

        if (conversationId != null && !conversationId.isBlank()) {
            return "/guest/messages/" + conversationId;
        }

        if (eventType == null) {
            return null;
        }

        if (eventType.startsWith("BOOKING_") && bookingId != null && !bookingId.isBlank()) {
            return switch (recipientRole == null ? "" : recipientRole.toUpperCase(Locale.ROOT)) {
                case "HOST" -> "/host/reservations/" + bookingId;
                case "ADMIN" -> "/admin/reservations";
                default -> "/trips/" + bookingId;
            };
        }

        if ("LISTING_SUSPENDED".equals(eventType) && "HOST".equalsIgnoreCase(recipientRole)) {
            return "/host/listings";
        }

        if ("REFUND_CREATED".equals(eventType) && bookingId != null && !bookingId.isBlank()) {
            return "/trips/" + bookingId;
        }

        return null;
    }

    private String shortRef(String value) {
        if (value == null || value.isBlank()) {
            return "n/a";
        }
        return value.length() <= 8 ? value : value.substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String moneyValue(Object value) {
        if (value == null) {
            return null;
        }
        try {
            BigDecimal amount = new BigDecimal(String.valueOf(value));
            return NumberFormat.getNumberInstance(Locale.US).format(amount);
        } catch (Exception ex) {
            return String.valueOf(value);
        }
    }

    private String suffixCurrency(String currency) {
        return currency == null || currency.isBlank() ? "" : " " + currency;
    }
}
