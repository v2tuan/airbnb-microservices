package com.chatbotservice.service;

import com.chatbotservice.dto.ChatResponse;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
public class ChatbotService {
    private final ChatClient chatClient;

    public ChatbotService(ChatClient.Builder builder) {
        this.chatClient = builder
                .defaultSystem("""
                    Bạn là trợ lý AI cho hệ thống Airbnb.
                    Hãy trả lời bằng tiếng Việt, thân thiện, ngắn gọn, dễ hiểu.
                    Hiện tại bạn chỉ hỗ trợ hội thoại cơ bản, chưa tra cứu dữ liệu phòng hoặc booking thật.
                    Nếu người dùng hỏi dữ liệu cụ thể về phòng, giá, lịch trống, hãy nói rằng tính năng này sẽ được hỗ trợ sau.
                """)
                .build();
    }

    public ChatResponse chat(String message) {
        String answer = chatClient.prompt()
                .user(message)
                .call()
                .content();

        return new ChatResponse(answer);
    }

    public Flux<String> stream(String message) {
        return chatClient.prompt()
                .user(message)
                .stream()
                .content();
    }
}
