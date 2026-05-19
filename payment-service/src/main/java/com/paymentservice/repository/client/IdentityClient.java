package com.paymentservice.repository.client;

import com.paymentservice.dto.identity.ClientTokenExchangeParam;
import com.paymentservice.dto.identity.ClientTokenExchangeResponse;
import feign.QueryMap;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "identity-client", url = "${idp.url}")
public interface IdentityClient {
    @PostMapping(value = "/realms/airbnb/protocol/openid-connect/token",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    ClientTokenExchangeResponse exchangeClientToken(@QueryMap ClientTokenExchangeParam param);
}
