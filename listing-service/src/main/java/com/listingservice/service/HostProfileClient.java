package com.listingservice.service;

import com.listingservice.dto.response.CompositeListingResponse;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
public class HostProfileClient {

  public CompositeListingResponse.HostProfileData getHostProfile(String hostId) {
    CompositeListingResponse.HostProfileData host = new CompositeListingResponse.HostProfileData();
    host.setUserId(parseUuid(hostId));
    host.setFullName("Host");
    host.setAvatarUrl(null);
    host.setSuperHost(Boolean.FALSE);
    host.setJoinedAt(Instant.now());
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
}

