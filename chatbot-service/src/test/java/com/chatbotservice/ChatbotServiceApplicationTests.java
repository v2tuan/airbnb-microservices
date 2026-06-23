package com.chatbotservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.ai.google.genai.api-key=test-api-key",
        "eureka.client.enabled=false",
        "spring.cloud.discovery.enabled=false"
})
class ChatbotServiceApplicationTests {

    @Test
    void contextLoads() {
    }

}
