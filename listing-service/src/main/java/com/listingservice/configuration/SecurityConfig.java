package com.listingservice.configuration;

import jakarta.servlet.http.Cookie;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    @Order(1)
    public SecurityFilterChain publicChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/listings/**")
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                );

        return http.build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain privateChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth -> oauth
//                        .bearerTokenResolver(cookieTokenResolver())
                        .jwt(Customizer.withDefaults()));

        return http.build();
    }

//    @Bean
//    public BearerTokenResolver cookieTokenResolver() {
//        return request -> {
//
//            // 1. ưu tiên Authorization header
//            String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
//
//            if (StringUtils.hasText(authHeader) &&
//                    authHeader.startsWith("Bearer ")) {
//
//                return authHeader.substring(7);
//            }
//
//            // 2. lấy từ cookie
//            if (request.getCookies() != null) {
//                for (Cookie cookie : request.getCookies()) {
//                    if ("accessToken".equals(cookie.getName())) {
//                        return cookie.getValue();
//                    }
//                }
//            }
//
//            return null;
//        };
//    }
}
