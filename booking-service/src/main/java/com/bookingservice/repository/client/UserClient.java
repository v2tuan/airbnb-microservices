package com.bookingservice.repository.client;

import com.bookingservice.dto.request.BatchPublicUserProfileRequest;
import com.bookingservice.dto.response.PublicUserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(name = "user-client", url = "${users.public-url:http://localhost:8082/users/public}")
public interface UserClient {
    @GetMapping("/{keycloakUserId}")
    PublicUserResponse getPublicUser(@PathVariable String keycloakUserId);

    @PostMapping("/batch")
    List<PublicUserResponse> getPublicUsers(@RequestBody BatchPublicUserProfileRequest request);
}
