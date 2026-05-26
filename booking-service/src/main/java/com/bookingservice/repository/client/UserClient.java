package com.bookingservice.repository.client;

import com.bookingservice.dto.response.PublicUserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-client", url = "${users.public-url:http://localhost:8082/users/public}")
public interface UserClient {
    @GetMapping("/{keycloakUserId}")
    PublicUserResponse getPublicUser(@PathVariable String keycloakUserId);
}
