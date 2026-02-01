package com.identityservice.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

@Configuration
@EnableWebSecurity
/**
 * Bật Spring Security cho tầng WEB (HTTP level)
 * Kích hoạt Security Filter Chain
 * => Cho phép cấu hình bảo mật cho request: JWT, login, phân quyền theo URL, CORS, CSRF…
 */
@EnableMethodSecurity
/**
 * Bật bảo mật ở TẦNG METHOD (service / controller)
 * Cho phép dùng @PreAuthorize, @PostAuthorize, @Secured, @RolesAllowed
 * Kiểm tra quyền ngay khi method được gọi
 */
public class SecurityConfig {

    @Value("${jwt.signerKey}")
    private String signerKey;

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 ->
                        oauth2.jwt(jwt ->
                                // gắn converter để map scope → authority
                                jwt
                                        // .decoder(jwtDecoder()) // cái này chỉ dùng khi định nghĩa nhiều decoder
                                        .jwtAuthenticationConverter(jwtAuthenticationConverter()))
                );

        return http.build();
    }

    /**
     *
     * NHIỆM VỤ:
     * - Verify chữ ký JWT
     * - Check exp, nbf
     *
     * CHỈ CẦN KHAI BÁO @Bean
     * KHÔNG CẦN jwt.decoder(jwtDecoder())
     *    → Spring auto-wire
     */
    @Bean
    JwtDecoder jwtDecoder() {

        // secret dùng khi ký token (HS512)
        SecretKey secretKey = new SecretKeySpec(
                signerKey.getBytes(),
                "HmacSHA512"
        );

        return NimbusJwtDecoder
                .withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS512)
                .build();
    }

    /**
     *
     * NHIỆM VỤ:
     * - Chuyển JWT → Authentication
     * - Map claim → GrantedAuthority
     */
    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {

        /**
         * Converter con:
         * - Lấy quyền từ claim
         * - Gắn prefix
         */
        JwtGrantedAuthoritiesConverter authoritiesConverter =
                new JwtGrantedAuthoritiesConverter();

        /**
         * JWT payload ví dụ:
         * {
         *   "sub": "tuan",
         *   "scope": "order.read order.write"
         * }
         *
         * → nói Spring:
         *   "quyền nằm trong claim 'scope'"
         *
         *  mặc định spring se tìm trong claim "scope" hoặc "scp"
         */
        authoritiesConverter.setAuthoritiesClaimName("scope");

        /**
         * KHÔNG setAuthorityPrefix
         *
         * → Spring dùng MẶC ĐỊNH:
         *    SCOPE_
         *
         * Ví dụ:
         *   scope: "order.read"
         *   → authority: SCOPE_order.read
         *
         * Nếu muốn ROLE:
         * authoritiesConverter.setAuthorityPrefix("ROLE_");
         */
        authoritiesConverter.setAuthorityPrefix(""); // Vì đã set thẳng trong claim có prefix ROLE rồi nên ở đây set là ""

        JwtAuthenticationConverter authenticationConverter =
                new JwtAuthenticationConverter();

        authenticationConverter
                .setJwtGrantedAuthoritiesConverter(authoritiesConverter);

        return authenticationConverter;
    }
}
