package com.identityservice.configuration;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.authorization.client.InMemoryRegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.UUID;

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

    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerChain(HttpSecurity http) throws Exception {

        http
                .oauth2AuthorizationServer(authorizationServer -> {
                    // Quan trọng: giới hạn chain này chỉ áp cho endpoints của Authorization Server
                    http.securityMatcher(authorizationServer.getEndpointsMatcher());

                    // Bật OIDC (/.well-known/openid-configuration, v.v.)
                    authorizationServer.oidc(Customizer.withDefaults());
                })
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                .exceptionHandling(ex -> ex.defaultAuthenticationEntryPointFor(
                        new LoginUrlAuthenticationEntryPoint("/login"),
                        new MediaTypeRequestMatcher(MediaType.TEXT_HTML)
                ));

        return http.build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain appChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/register").permitAll()
                        .anyRequest().authenticated())
                .formLogin(Customizer.withDefaults());
        return http.build();
    }

    @Bean
    public AuthorizationServerSettings authorizationServerSettings(
            @Value("${app.issuer}") String issuer
    ) {
        return AuthorizationServerSettings.builder().issuer(issuer).build();
    }

    @Bean
    public JWKSource<SecurityContext> jwkSource() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        KeyPair kp = kpg.generateKeyPair();

        RSAPublicKey publicKey = (RSAPublicKey) kp.getPublic();
        RSAPrivateKey privateKey = (RSAPrivateKey) kp.getPrivate();

        RSAKey rsaKey = new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .keyID(UUID.randomUUID().toString())
                .build();

        JWKSet jwkSet = new JWKSet(rsaKey);
        return (selector, context) -> selector.select(jwkSet);
    }

    @Bean
    public RegisteredClientRepository registeredClientRepository() {

        RegisteredClient bookingClient =
                RegisteredClient.withId(UUID.randomUUID().toString())
                        .clientId("booking-service-client")
                        .clientSecret("{noop}secret")
                        .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                        .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
                        .scope("booking.read")
                        .scope("booking.write")
                        .build();

        return new InMemoryRegisteredClientRepository(bookingClient);
    }

    @Bean
    public PasswordEncoder passwordEncoder(){
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}
