package com.apigateway.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.util.matcher.ServerWebExchangeMatchers;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Value("${app.api-prefix}")
    String prefix;

    /**
     * Cách cũ khi token hết hạn thì khi vào các api public cũng bị chặn
     */
//    @Bean
//    public SecurityWebFilterChain securityFilterChain(ServerHttpSecurity http) {
//
//        http
//                .csrf(ServerHttpSecurity.CsrfSpec::disable)
//                .cors(Customizer.withDefaults())
//                .authorizeExchange(exchange -> exchange
//                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
//                        .pathMatchers(HttpMethod.GET, prefix + "/profile/**").permitAll()
//                        .pathMatchers(prefix + "/users/auth/**").permitAll()
//                        .pathMatchers(prefix + "/listings/**").permitAll()
//                        .pathMatchers(prefix + "/ratings/**").permitAll()
//                        .anyExchange().authenticated()
//                )
//                .oauth2ResourceServer(oauth ->
//                        oauth.jwt(Customizer.withDefaults())
//                );
//
//        return http.build();
//    }

    // =========================
    // 1. PUBLIC API (NO JWT)
    // =========================
    @Bean
    @Order(1)
    public SecurityWebFilterChain publicChain(ServerHttpSecurity http) {

        return http
                .securityMatcher(ServerWebExchangeMatchers.pathMatchers(
                        prefix + "/users/auth/**",
                        prefix + "/listings/**",
                        prefix + "/ratings/**",
                        prefix + "/profile/**",
                        // Ensure literal API prefix route is also allowed in case
                        // the `prefix` value isn't available at runtime for any reason.
                        "/api/v1/profile/**",
                        prefix + "/payments/webhook"
                ))
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .cors(Customizer.withDefaults())
                .authorizeExchange(ex -> ex.anyExchange().permitAll())
                .build();
    }

    // =========================
    // 2. SECURE API (JWT REQUIRED)
    // =========================
    @Bean
    @Order(2)
    public SecurityWebFilterChain secureChain(ServerHttpSecurity http) {

        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .cors(Customizer.withDefaults())
                .authorizeExchange(ex -> ex
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyExchange().authenticated()
                )
                .oauth2ResourceServer(oauth ->
                        oauth
//                                .bearerTokenConverter(bearerTokenConverter())
                                .jwt(Customizer.withDefaults())
                )
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:3000",
                "http://localhost:3001"
        ));

        configuration.setAllowedMethods(List.of("*"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

//    @Bean
//    public ServerAuthenticationConverter bearerTokenConverter() {
//
//        return exchange -> {
//
//            // Header trước
//            String authHeader = exchange.getRequest()
//                    .getHeaders()
//                    .getFirst(HttpHeaders.AUTHORIZATION);
//
//            if (StringUtils.hasText(authHeader)
//                    && authHeader.startsWith("Bearer ")) {
//
//                String token = authHeader.substring(7);
//
//                return Mono.just(
//                        new BearerTokenAuthenticationToken(token)
//                );
//            }
//
//            // Cookie sau
//            HttpCookie cookie = exchange.getRequest()
//                    .getCookies()
//                    .getFirst("accessToken");
//
//            if (cookie == null) {
//                return Mono.empty();
//            }
//
//            return Mono.just(
//                    new BearerTokenAuthenticationToken(cookie.getValue())
//            );
//        };
//    }

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
