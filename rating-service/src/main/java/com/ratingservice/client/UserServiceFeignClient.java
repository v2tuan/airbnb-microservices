package com.ratingservice.client;

import com.ratingservice.dto.BatchPublicUserProfileRequest;
import com.ratingservice.dto.UserProfileDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(name = "user-service", path = "/users/public")
public interface UserServiceFeignClient {

  @GetMapping("/{keycloakUserId}")
  UserProfileDTO getByKeycloakUserId(@PathVariable String keycloakUserId);

  @PostMapping("/batch")
  List<UserProfileDTO> getBatch(@RequestBody BatchPublicUserProfileRequest request);
}
