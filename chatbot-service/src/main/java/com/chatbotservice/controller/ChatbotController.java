package com.chatbotservice.controller;

import com.chatbotservice.dto.ChatRequest;
import com.chatbotservice.dto.ChatResponse;
import com.chatbotservice.service.ChatbotService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/chatbot")
@Slf4j
public class ChatbotController {
    private final ChatbotService chatbotService;

    public ChatbotController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

//    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
//    public Flux<String> stream(@RequestBody ChatRequest request) {
//        return chatbotService.stream(request.message())
//                .onErrorResume(ex ->
//                        Flux.just("Xin lỗi, chatbot hiện đang hết quota Gemini. Vui lòng thử lại sau.")
//                );
//    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> stream(@RequestBody ChatRequest request) {
        return chatbotService.stream(request.message())
                .filter(chunk -> chunk != null && !chunk.isEmpty())
                .map(chunk -> ServerSentEvent.builder(chunk)
                        .event("message")
                        .build())
                .onErrorResume(ex -> {
                    log.error("Chatbot stream failed", ex);

                    return Flux.just(
                            ServerSentEvent.builder("Xin lỗi, chatbot hiện đang gặp lỗi. Vui lòng thử lại sau.")
                                    .event("error")
                                    .build()
                    );
                });
    }
}
