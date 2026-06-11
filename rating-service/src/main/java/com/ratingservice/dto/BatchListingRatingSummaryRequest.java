package com.ratingservice.dto;

import java.util.List;

public record BatchListingRatingSummaryRequest(List<String> listingIds) {
}
