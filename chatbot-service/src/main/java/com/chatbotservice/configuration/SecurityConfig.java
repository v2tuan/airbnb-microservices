package com.chatbotservice.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .cors(Customizer.withDefaults())
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((exchange, ex) -> writeError(
                                exchange,
                                HttpStatus.UNAUTHORIZED,
                                "UNAUTHORIZED",
                                "Bạn cần đăng nhập để sử dụng chatbot."
                        ))
                        .accessDeniedHandler((exchange, ex) -> writeError(
                                exchange,
                                HttpStatus.FORBIDDEN,
                                "FORBIDDEN",
                                "Bạn không có quyền sử dụng tài nguyên này."
                        ))
                )
                .authorizeExchange(exchange -> exchange
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .pathMatchers(HttpMethod.GET, "/chatbot/health").permitAll()
                        .pathMatchers(HttpMethod.POST, "/chatbot/stream").authenticated()
                        .anyExchange().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
                .build();
    }

    private Mono<Void> writeError(
            ServerWebExchange exchange,
            HttpStatus status,
            String code,
            String message
    ) {
        var response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = """
                {"success":false,"code":"%s","message":"%s"}
                """.formatted(code, message);

        return response.writeWith(Mono.just(
                response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8))
        ));
    }
}
