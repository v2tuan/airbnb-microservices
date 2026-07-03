package com.listingservice.service;

import com.listingservice.dto.response.CompositeListingResponse;
import com.listingservice.dto.response.PublicHostResponseDTO;
import com.listingservice.repository.client.UserServiceFeignClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class HostProfileClient {

  private final UserServiceFeignClient userServiceFeignClient;

  public CompositeListingResponse.HostProfileData getHostProfile(String hostId) {
    CompositeListingResponse.HostProfileData host = new CompositeListingResponse.HostProfileData();

    if (hostId == null || hostId.isBlank()) {
      host.setFullName("Host");
      host.setSuperHost(Boolean.FALSE);
      return host;
    }

    try {
      PublicHostResponseDTO profile = userServiceFeignClient.getPublicUser(hostId);
      if (profile != null) {
        host.setUserId(profile.userId());
        host.setFullName(defaultString(profile.fullName(), "Host"));
        host.setAvatarUrl(profile.avatarUrl());
        host.setSuperHost(Boolean.TRUE.equals(profile.superHost()));
        host.setJoinedAt(profile.joinedAt());
        return host;
      }
    } catch (RuntimeException ex) {
      log.warn("Failed to fetch host profile for hostId={}", hostId, ex);
    }

    host.setUserId(parseUuid(hostId));
    host.setFullName("Host");
    host.setSuperHost(Boolean.FALSE);
    return host;
  }

  private UUID parseUuid(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return UUID.fromString(value);
    } catch (IllegalArgumentException ex) {
      return null;
    }
  }

  private String defaultString(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value;
  }
}

