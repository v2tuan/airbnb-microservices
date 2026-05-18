package com.userservice.config;

import jakarta.servlet.http.Cookie;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/profile/**").permitAll()
                        .requestMatchers("/auth/**").permitAll()

                        /*
                         * QUAN TRỌNG:
                         *
                         * Khi controller/service throw exception,
                         * Spring Boot sẽ internally forward request tới endpoint "/error"
                         * để BasicErrorController xử lý và trả JSON error response.
                         *
                         * Sau khi thêm Spring Security:
                         *
                         * Exception
                         *   -> forward "/error"
                         *   -> Security filter chạy lại
                         *   -> "/error" bị chặn bởi:
                         *
                         *      .anyRequest().authenticated()
                         *
                         * => Client chỉ nhận được:
                         *      401 Unauthorized
                         *
                         * dù exception gốc thực sự là:
                         *      409 Conflict / 500 Internal Server Error / ...
                         *
                         * Vì vậy cần permit "/error"
                         * để Spring có thể trả về error response gốc.
                         */
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth ->
                        oauth
//                                .bearerTokenResolver(cookieTokenResolver())
                                .jwt(Customizer.withDefaults())
                );

        return http.build();
    }

//        @Bean
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