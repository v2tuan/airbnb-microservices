package com.userservice.dto.projection;

import com.userservice.entity.StripeAccountStatus;
import com.userservice.entity.UserRole;

import java.time.LocalDateTime;
import java.util.UUID;

public interface AdminUserRow {
  UUID getUserId();

  String getKeycloakUserId();

  String getFirstName();

  String getLastName();

  String getAvatarUrl();

  String getGender();

  Boolean getHost();

  Boolean getSuperhost();

  Boolean getAccountEnabled();

  UserRole getAccountRole();

  String getHostVerificationStatus();

  StripeAccountStatus getStripeAccountStatus();

  LocalDateTime getCreatedAt();

  LocalDateTime getUpdatedAt();
}
