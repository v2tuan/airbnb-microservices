package com.activityservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ActivityBatchRequest(@NotEmpty List<@Valid ActivityRequest> activities) {
}

