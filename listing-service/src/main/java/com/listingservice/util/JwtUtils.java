package com.listingservice.util;

import tools.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

/**
 * Utility class for extracting information from JWT tokens.
 * Matches the implementation pattern used in user-service.
 */
@Slf4j
@Component
public class JwtUtils {

    private final ObjectMapper objectMapper;

    public JwtUtils() {
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Extracts the Keycloak user ID from the Authorization header.
     *
     * @param authorizationHeader The Authorization header containing "Bearer {token}"
     * @return The Keycloak user ID (sub claim)
     * @throws RuntimeException if the header is invalid or JWT parsing fails
     */
    public String extractKeycloakUserId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Missing or invalid Authorization header");
        }
        String token = authorizationHeader.substring(7);
        return extractSubFromJwt(token);
    }

    /**
     * Extracts the "sub" claim (Keycloak user ID) from a JWT token.
     * Note: This method does NOT validate the JWT signature or expiration.
     *
     * @param token The JWT token string
     * @return The subject (sub) claim value
     * @throws RuntimeException if JWT parsing fails
     */
    private String extractSubFromJwt(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) {
                throw new RuntimeException("Invalid JWT format");
            }

            // Decode the payload (second part of JWT)
            byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
            String payload = new String(decoded, StandardCharsets.UTF_8);

            // Parse JSON and extract "sub" claim
            Map<String, Object> claims = objectMapper.readValue(payload, Map.class);
            String sub = (String) claims.get("sub");

            if (sub == null || sub.isBlank()) {
                throw new RuntimeException("JWT 'sub' claim is missing or empty");
            }

            log.debug("Extracted Keycloak user ID: {}", sub);
            return sub;
        } catch (Exception e) {
            log.error("Failed to parse JWT token: {}", e.getMessage());
            throw new RuntimeException("Failed to parse JWT: " + e.getMessage());
        }
    }
}
