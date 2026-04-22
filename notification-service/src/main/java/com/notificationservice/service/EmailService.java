package com.notificationservice.service;

import com.notificationservice.dto.request.EmailRequest;
import com.notificationservice.dto.request.SendEmailRequest;
import com.notificationservice.dto.request.Sender;
import com.notificationservice.dto.response.EmailResponse;
import com.notificationservice.repository.httpClient.EmailClient;
import jakarta.mail.internet.MimeMessage;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EmailService {
    EmailClient emailClient;

    JavaMailSender mailSender;

    @NonFinal
    @Value("${spring.mail.username}")
    String mailFrom;

//    public EmailResponse sendEmail(SendEmailRequest request) {
//        EmailRequest emailRequest = EmailRequest.builder()
//                .sender(Sender.builder()
//                        .email("vovantuan7702@gmail.com")
//                        .name("Airbnb").build())
//                .to(List.of(request.getTo()))
//                .subject(request.getSubject())
//                .htmlContent(request.getHtmlContent())
//                .build();
//
//        log.info(apiKey);
//
//        return emailClient.sendEmail(apiKey, emailRequest);
//    }

    public void sendEmail(SendEmailRequest request) {

        try {
            MimeMessage message = mailSender.createMimeMessage();

            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom);
            helper.setTo(request.getTo().getEmail());
            helper.setSubject(request.getSubject());

            // true = HTML
            helper.setText(request.getHtmlContent(), true);

            mailSender.send(message);
        }
        catch (Exception e) {
            throw new RuntimeException("Send email fail", e);
        }
    }
}
