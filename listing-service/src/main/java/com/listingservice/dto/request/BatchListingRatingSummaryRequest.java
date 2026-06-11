package com.listingservice.dto.request;

import java.util.List;

public record BatchListingRatingSummaryRequest(List<String> listingIds) {
}
