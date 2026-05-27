package com.userservice.config;

import jakarta.servlet.http.Cookie;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

//    @Bean
//    public SecurityFilterChain securityFilterChain(HttpSecurity http)
//            throws Exception {
//
//        http
//                .csrf(csrf -> csrf.disable())
//                .cors(Customizer.withDefaults())
//                .authorizeHttpRequests(auth -> auth
//                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
//                        .requestMatchers(HttpMethod.GET, "/profile/**").permitAll()
//                        .requestMatchers("/auth/**").permitAll()
//                        .requestMatchers("/public/**").permitAll()
//
//                        /*
//                         * QUAN TRỌNG:
//                         *
//                         * Khi controller/service throw exception,
//                         * Spring Boot sẽ internally forward request tới endpoint "/error"
//                         * để BasicErrorController xử lý và trả JSON error response.
//                         *
//                         * Sau khi thêm Spring Security:
//                         *
//                         * Exception
//                         *   -> forward "/error"
//                         *   -> Security filter chạy lại
//                         *   -> "/error" bị chặn bởi:
//                         *
//                         *      .anyRequest().authenticated()
//                         *
//                         * => Client chỉ nhận được:
//                         *      401 Unauthorized
//                         *
//                         * dù exception gốc thực sự là:
//                         *      409 Conflict / 500 Internal Server Error / ...
//                         *
//                         * Vì vậy cần permit "/error"
//                         * để Spring có thể trả về error response gốc.
//                         */
//                        .requestMatchers("/error").permitAll()
//                        .anyRequest().authenticated()
//                )
//                .oauth2ResourceServer(oauth ->
//                        oauth
//                                .jwt(Customizer.withDefaults())
//                );
//
//        return http.build();
//    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                /*
                 * REST API + JWT => không cần CSRF
                 */
                .csrf(AbstractHttpConfigurer::disable)

                /*
                 * Enable CORS
                 */
                .cors(Customizer.withDefaults())

                /*
                 * Stateless vì dùng JWT
                 */
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                /*
                 * Authorization rules
                 */
                .authorizeHttpRequests(auth -> auth

                        /*
                         * Preflight request cho frontend
                         */
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        /*
                         * Public APIs
                         */
                        .requestMatchers(
                                "/auth/**",
                                "/public/**",
                                "/error"
                        ).permitAll()

                        /*
                         * Public GET profile
                         */
                        .requestMatchers(HttpMethod.GET, "/profile/**")
                        .permitAll()

                        /*
                         * Các request còn lại cần JWT
                         */
                        .anyRequest().authenticated()
                )

                /*
                 * Keycloak JWT validation
                 */
                .oauth2ResourceServer(oauth ->
                        oauth.jwt(Customizer.withDefaults())
                );

        return http.build();
    }
}