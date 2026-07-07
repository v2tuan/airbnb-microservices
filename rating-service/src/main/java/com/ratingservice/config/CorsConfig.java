package com.ratingservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
  @Value("${APP_CORS_ALLOWED_ORIGIN_PATTERNS:http://localhost:3000}")
  private String allowedOriginPatterns;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/**")
        .allowedOriginPatterns(splitCsv(allowedOriginPatterns))
        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(true)
        .maxAge(3600);
  }

  private String[] splitCsv(String value) {
    return Arrays.stream(value.split(","))
        .map(String::trim)
        .filter(origin -> !origin.isBlank())
        .toArray(String[]::new);
  }
}
