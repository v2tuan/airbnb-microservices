package com.listingservice.dto.request;

import java.util.List;
import java.util.UUID;

public record ListingBatchRequest(
        List<UUID> listingIds
) {}
