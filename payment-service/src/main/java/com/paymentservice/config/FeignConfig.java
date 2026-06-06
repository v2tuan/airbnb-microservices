package com.paymentservice.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paymentservice.exception.BusinessException;
import com.paymentservice.exception.ErrorResponse;
import feign.Request;
import feign.Response;
import feign.RequestInterceptor;
import feign.Retryer;
import feign.codec.ErrorDecoder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.TimeUnit;

@Configuration
@Slf4j
public class FeignConfig {
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Bean
    public RequestInterceptor requestInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

            if (attrs != null) {
                String token = attrs.getRequest().getHeader("Authorization");
                if (token != null) {
                    requestTemplate.header("Authorization", token);
                }
            }
        };
    }

    @Bean
    public ErrorDecoder feignErrorDecoder() {
        return (methodKey, response) -> {
            ErrorResponse error = readErrorResponse(response);
            HttpStatus status = resolveStatus(response.status());

            if (error != null && status != null && status.is4xxClientError()) {
                return new BusinessException(status, error.errorCode(), error.message());
            }

            log.error("Downstream service failure methodKey={} status={} message={}",
                    methodKey, response.status(), error != null ? error.message() : "-");
            return BusinessException.downstream("A dependent service is currently unavailable. Please try again later.");
        };
    }

    @Bean
    public Request.Options feignRequestOptions() {
        return new Request.Options(1, TimeUnit.SECONDS, 3, TimeUnit.SECONDS, true);
    }

    @Bean
    public Retryer feignRetryer() {
        return Retryer.NEVER_RETRY;
    }

    private ErrorResponse readErrorResponse(Response response) {
        if (response.body() == null) {
            return null;
        }
        try (InputStream inputStream = response.body().asInputStream()) {
            return objectMapper.readValue(inputStream, ErrorResponse.class);
        } catch (IOException exception) {
            log.warn("Failed to parse downstream error response status={}", response.status(), exception);
            return null;
        }
    }

    private HttpStatus resolveStatus(int statusCode) {
        try {
            return HttpStatus.valueOf(statusCode);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }
}
