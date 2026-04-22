package com.notificationservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class TemplateEngineService {
    private final SpringTemplateEngine templateEngine;

    public String render(String templateName, Map<String, Object> data) {

        Context context = new Context();
        context.setVariables(data);

        return templateEngine.process(templateName, context);
    }
}
