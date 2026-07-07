package com.userservice.dto.identity;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class KeycloakUserUpdateRequest {
    private Boolean enabled;
}
