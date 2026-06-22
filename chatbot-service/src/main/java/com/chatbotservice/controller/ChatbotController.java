package com.chatbotservice.controller;

import com.chatbotservice.dto.ChatRequest;
import com.chatbotservice.dto.ChatStreamEvent;
import com.chatbotservice.service.ChatbotService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/chatbot")
@Slf4j
public class ChatbotController {
    private final ChatbotService chatbotService;

    public ChatbotController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "service", "chatbot-service");
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> stream(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody(required = false) Mono<ChatRequest> request
    ) {
        if (jwt == null || !StringUtils.hasText(jwt.getSubject())) {
            return Flux.just(errorEvent("Bạn cần đăng nhập để sử dụng chatbot."));
        }

        Mono<ChatRequest> safeRequest = request != null ? request : Mono.empty();

        return safeRequest
                .defaultIfEmpty(new ChatRequest(null, null))
                .flatMapMany(chatRequest -> {
                    String message = chatRequest != null ? chatRequest.message() : null;

                    if (!StringUtils.hasText(message)) {
                        return Flux.just(errorEvent("Tin nhắn không được để trống."));
                    }

                    String userId = jwt.getSubject();

                    return chatbotService.stream(message.trim(), userId, chatRequest.conversationId())
                            .filter(event -> event != null && event.data() != null && !event.data().isEmpty())
                            .map(this::streamEvent)
                            .concatWithValues(doneEvent());
                })
                .onErrorResume(ex -> {
                    log.error("Chatbot stream failed", ex);
                    return Flux.just(errorEvent(chatbotService.toClientMessage(ex)));
                });
    }

    private ServerSentEvent<String> streamEvent(ChatStreamEvent event) {
        // Keep event names explicit so the frontend can route Markdown tokens and
        // structured listing card JSON to different UI components.
        return ServerSentEvent.builder(event.data())
                .event(event.event())
                .build();
    }

    private ServerSentEvent<String> doneEvent() {
        return ServerSentEvent.builder("[DONE]")
                .event("done")
                .build();
    }

    private ServerSentEvent<String> errorEvent(String message) {
        return ServerSentEvent.builder(message)
                .event("error")
                .build();
    }
}
