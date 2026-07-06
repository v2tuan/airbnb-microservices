package com.listingservice.repository.client;

import com.listingservice.dto.response.PublicHostResponseDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service", path = "/users/public")
public interface UserServiceFeignClient {

  @GetMapping("/{keycloakUserId}")
  PublicHostResponseDTO getPublicUser(@PathVariable String keycloakUserId);
}
