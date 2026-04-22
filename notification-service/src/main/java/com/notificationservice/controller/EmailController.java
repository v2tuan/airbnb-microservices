package com.notificationservice.controller;

import com.event.dto.NotificationEvent;
import com.notificationservice.config.TemplateMappingConfig;
import com.notificationservice.dto.ApiResponse;
import com.notificationservice.dto.request.Recipient;
import com.notificationservice.dto.request.SendEmailRequest;
import com.notificationservice.dto.response.EmailResponse;
import com.notificationservice.service.EmailService;
import com.notificationservice.service.TemplateEngineService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EmailController {
    EmailService emailService;
    ObjectMapper objectMapper;
    TemplateMappingConfig mappingConfig;
    TemplateEngineService templateEngineService;

    @PostMapping("/email/send")
    public ResponseEntity<ApiResponse<Void>> sendEmail(@RequestBody SendEmailRequest request) {
        emailService.sendEmail(request);
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.<Void>builder()
                        .success(true)
                        .message("Send email successful")
                        .build());
    }

    @KafkaListener(topics = "user.notification.email")
    public void send(byte[] message){
        NotificationEvent event = objectMapper.readValue(message, NotificationEvent.class);

        // 1. Lấy template name
        String templateName = mappingConfig.getTemplates().get(event.getEventType());

        if(templateName == null) {
            throw new RuntimeException("No template mapping found");
        }

        // 2. Render HTML
        String html = templateEngineService.render(
                templateName,
                event.getPayload()
        );

        // 3. Subject
        String subject = "Welcome " + event.getPayload().get("firstName");

        log.info("Received event {}", event.getEventType());

        SendEmailRequest request = SendEmailRequest.builder()
                .to(Recipient.builder()
                        .email(event.getRecipientEmail()).build())
                .subject(subject)
                .htmlContent(html)
                .build();

        emailService.sendEmail(request);
    }
}
