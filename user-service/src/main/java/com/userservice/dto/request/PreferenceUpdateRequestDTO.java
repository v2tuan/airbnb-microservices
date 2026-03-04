package com.userservice.dto.request;

import java.util.Map;

public record PreferenceUpdateRequestDTO(
    String currency,
    String language,
    String timezone,
    Map<String, Object> notifications // Cho JSONB
) {
}
