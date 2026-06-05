package com.apigateway.configuration;

import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.server.ServerAuthenticationEntryPoint;
import org.springframework.security.web.server.authentication.ServerAuthenticationFailureHandler;
import org.springframework.security.web.server.authorization.ServerAccessDeniedHandler;
import org.springframework.security.web.server.WebFilterExchange;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

/**
 * Always return JSON 401/403 — avoids Spring WebFlux returning 406 Not Acceptable
 * when the client sends Accept: application/json on auth failures.
 */
@Component
public class GatewayAuthenticationHandlers
        implements ServerAuthenticationEntryPoint, ServerAuthenticationFailureHandler, ServerAccessDeniedHandler {

    private static final byte[] UNAUTHORIZED_BODY =
            "{\"success\":false,\"code\":4001,\"message\":\"Unauthorized\"}"
                    .getBytes(StandardCharsets.UTF_8);

    private static final byte[] TOKEN_EXPIRED_BODY =
            "{\"success\":false,\"code\":4003,\"message\":\"Access token expired\"}"
                    .getBytes(StandardCharsets.UTF_8);

    private static final byte[] FORBIDDEN_BODY =
            "{\"success\":false,\"code\":4004,\"message\":\"Forbidden\"}"
                    .getBytes(StandardCharsets.UTF_8);

    @Override
    public Mono<Void> commence(ServerWebExchange exchange, AuthenticationException ex) {
        return writeJson(exchange, HttpStatus.UNAUTHORIZED, bodyFor(ex));
    }

    /** Invalid/expired Bearer token — without this handler Spring returns 406 with empty body. */
    @Override
    public Mono<Void> onAuthenticationFailure(WebFilterExchange webFilterExchange, AuthenticationException exception) {
        return commence(webFilterExchange.getExchange(), exception);
    }

    private byte[] bodyFor(AuthenticationException ex) {
        String message = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        if (message.contains("expired") || message.contains("jwt expired")) {
            return TOKEN_EXPIRED_BODY;
        }
        return UNAUTHORIZED_BODY;
    }

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, org.springframework.security.access.AccessDeniedException denied) {
        return writeJson(exchange, HttpStatus.FORBIDDEN, FORBIDDEN_BODY);
    }

    private Mono<Void> writeJson(ServerWebExchange exchange, HttpStatus status, byte[] body) {
        var response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        DataBuffer buffer = response.bufferFactory().wrap(body);
        return response.writeWith(Mono.just(buffer));
    }
}
