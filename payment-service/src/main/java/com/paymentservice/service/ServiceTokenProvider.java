package com.paymentservice.service;

import com.paymentservice.dto.identity.ClientTokenExchangeParam;
import com.paymentservice.dto.identity.ClientTokenExchangeResponse;
import com.paymentservice.repository.client.IdentityClient;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ServiceTokenProvider {
    private final IdentityClient identityClient;

    @Value("${idp.client-id}")
    private String clientId;

    @Value("${idp.client-secret}")
    private String clientSecret;

    public String bearerToken() {
        ClientTokenExchangeResponse token = identityClient.exchangeClientToken(ClientTokenExchangeParam.builder()
                .grant_type("client_credentials")
                .client_id(clientId)
                .client_secret(clientSecret)
                .scope("openid")
                .build());
        return "Bearer " + token.getAccessToken();
    }
}
