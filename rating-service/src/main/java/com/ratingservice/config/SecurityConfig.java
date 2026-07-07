package com.ratingservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .cors(Customizer.withDefaults())
        .csrf(csrf -> csrf.disable())
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers(HttpMethod.POST, "/ratings/listings/summary").permitAll()
            .requestMatchers(HttpMethod.GET, "/ratings/bookings/**").authenticated()
            .requestMatchers(HttpMethod.GET, "/ratings/**").permitAll()
            .requestMatchers(HttpMethod.POST, "/ratings").authenticated()
            .requestMatchers(HttpMethod.PUT, "/ratings/**").authenticated()
            .requestMatchers(HttpMethod.DELETE, "/ratings/**").authenticated()
            .anyRequest().authenticated())
        .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));

    return http.build();
  }
}
