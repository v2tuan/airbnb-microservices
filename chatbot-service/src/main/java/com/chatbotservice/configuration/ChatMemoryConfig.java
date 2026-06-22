package com.chatbotservice.configuration;

import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.InMemoryChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ChatMemoryConfig {

    @Bean
    ChatMemory chatMemory(ChatbotProperties properties) {
        // Spring AI ChatMemory is responsible for replaying recent user/assistant
        // messages into each new prompt. The repository is in-memory for this first
        // implementation, so it is suitable for local/dev and a single service instance.
        // In production, replace only the repository with Redis/JDBC; ChatbotService can
        // continue using MessageChatMemoryAdvisor in the same way.
        return MessageWindowChatMemory.builder()
                .chatMemoryRepository(new InMemoryChatMemoryRepository())
                .maxMessages(properties.memory().maxMessages())
                .build();
    }
}
