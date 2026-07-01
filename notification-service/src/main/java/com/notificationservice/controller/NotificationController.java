package com.notificationservice.controller;

import com.notificationservice.dto.NotificationResponse;
import com.notificationservice.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getNotifications(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "20") int limit
    ) {
        String userId = jwt.getSubject();
        List<NotificationResponse> notifications = notificationService.getNotifications(userId, unreadOnly, limit);

        return ResponseEntity.ok(Map.of(
                "items", notifications,
                "totalUnread", notificationService.getUnreadCount(userId)
        ));
    }

    @GetMapping("/me/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(jwt.getSubject())));
    }

    @PatchMapping("/me/read-all")
    public ResponseEntity<Map<String, Boolean>> markAllRead(@AuthenticationPrincipal Jwt jwt) {
        notificationService.markAllAsRead(jwt.getSubject());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Map<String, Boolean>> markRead(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String notificationId
    ) {
        notificationService.markAsRead(jwt.getSubject(), notificationId);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
