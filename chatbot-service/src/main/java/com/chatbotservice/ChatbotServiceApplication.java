package com.chatbotservice;

import com.chatbotservice.configuration.ChatbotProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(excludeName = {
        "org.springframework.ai.model.openai.autoconfigure.OpenAiAudioSpeechAutoConfiguration"
})
@EnableConfigurationProperties(ChatbotProperties.class)
@EnableFeignClients
public class ChatbotServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChatbotServiceApplication.class, args);
    }

}
