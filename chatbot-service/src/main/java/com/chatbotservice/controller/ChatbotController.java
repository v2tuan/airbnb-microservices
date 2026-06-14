package com.chatbotservice.controller;

import com.chatbotservice.dto.ChatRequest;
import com.chatbotservice.dto.ChatResponse;
import com.chatbotservice.service.ChatbotService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/chatbot")
public class ChatbotController {
    private final ChatbotService chatbotService;

    public ChatbotController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    @PostMapping("/chat")
    public ChatResponse chat(@RequestBody ChatRequest request) {
        return chatbotService.chat(request.message());
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> stream(@RequestBody ChatRequest request) {
        return chatbotService.stream(request.message());
    }

    @GetMapping("/health")
    public String health() {
        return "chatbot-service is running";
    }
}
