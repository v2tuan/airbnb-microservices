package com.listingservice.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain listingChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/listings/**")
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/listings/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/listings/**").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth -> oauth
//                        .bearerTokenResolver(cookieTokenResolver())
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));

        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(this::extractAuthorities);
        return converter;
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        Object rolesClaim = realmAccess != null ? realmAccess.get("roles") : List.of();

        if (!(rolesClaim instanceof Collection<?> roles)) {
            return List.of();
        }

        return roles.stream()
            .filter(String.class::isInstance)
            .map(String.class::cast)
            .flatMap(role -> Stream.<GrantedAuthority>of(
                new SimpleGrantedAuthority(role),
                new SimpleGrantedAuthority("ROLE_" + role)
            ))
            .collect(Collectors.toList());
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
