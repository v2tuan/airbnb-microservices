package com.chatbotservice.dto;

public record ChatRequest(
        String message,
        String conversationId
) {
}
