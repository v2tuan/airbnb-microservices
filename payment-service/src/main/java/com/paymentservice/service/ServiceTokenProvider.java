package com.paymentservice.service;

import com.paymentservice.dto.identity.ClientTokenExchangeParam;
import com.paymentservice.dto.identity.ClientTokenExchangeResponse;
import com.paymentservice.repository.client.IdentityClient;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class ServiceTokenProvider {
    private final IdentityClient identityClient;

    @Value("${idp.client-id}")
    private String clientId;

    @Value("${idp.client-secret}")
    private String clientSecret;

    private volatile String cachedBearerToken;
    private volatile Instant expiresAt = Instant.EPOCH;

    public synchronized String bearerToken() {
        if (cachedBearerToken != null && Instant.now().isBefore(expiresAt.minusSeconds(30))) {
            return cachedBearerToken;
        }

        ClientTokenExchangeResponse token = identityClient.exchangeClientToken(ClientTokenExchangeParam.builder()
                .grant_type("client_credentials")
                .client_id(clientId)
                .client_secret(clientSecret)
                .scope("openid")
                .build());

        cachedBearerToken = "Bearer " + token.getAccessToken();
        expiresAt = Instant.now().plusSeconds(parseExpiresIn(token.getExpiresIn()));
        return cachedBearerToken;
    }

    private long parseExpiresIn(String expiresIn) {
        try {
            return Long.parseLong(expiresIn);
        } catch (RuntimeException ex) {
            return 60;
        }
    }
}
