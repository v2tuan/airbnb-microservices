package com.apigateway.configuration;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * After the gateway validates the Keycloak JWT, forward the subject to downstream
 * services (message-service) so they do not need to re-verify the bearer token.
 */
@Component
public class ForwardUserIdGatewayFilter implements GlobalFilter, Ordered {

    /** Keycloak JWT subject — canonical id across Java microservices. */
    public static final String KEYCLOAK_USER_ID_HEADER = "X-Keycloak-User-Id";

    /** @deprecated use KEYCLOAK_USER_ID_HEADER; kept for backward compatibility */
    public static final String USER_ID_HEADER = "X-User-Id";

    public static final String GATEWAY_AUTH_HEADER = "X-Gateway-Authenticated";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .flatMap(securityContext -> {
                    var authentication = securityContext.getAuthentication();
                    if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
                        ServerHttpRequest request = exchange.getRequest().mutate()
                                .headers(headers -> {
                                    headers.set(KEYCLOAK_USER_ID_HEADER, jwt.getSubject());
                                    headers.set(USER_ID_HEADER, jwt.getSubject());
                                    headers.set(GATEWAY_AUTH_HEADER, "true");
                                })
                                .build();

                        return chain.filter(exchange.mutate().request(request).build());
                    }

                    return chain.filter(exchange);
                })
                .switchIfEmpty(chain.filter(exchange));
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE - 10;
    }
}
