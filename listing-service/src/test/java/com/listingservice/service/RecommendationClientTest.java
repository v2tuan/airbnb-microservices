package com.listingservice.service;

import com.listingservice.dto.response.RecommendationItemResponse;
import com.listingservice.dto.response.RecommendationResponse;
import com.listingservice.repository.client.RecommendationServiceFeignClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecommendationClientTest {

    @Mock
    RecommendationServiceFeignClient recommendationServiceFeignClient;

    @Test
    void blankUserIdFallsBackToAnonymousPopularityRecommendation() {
        RecommendationClient recommendationClient = new RecommendationClient(recommendationServiceFeignClient);

        when(recommendationServiceFeignClient.recommendForUser(eq("__anonymous__"), eq(3)))
                .thenReturn(new RecommendationResponse(
                        "__anonymous__",
                        List.of(new RecommendationItemResponse("11111111-1111-1111-1111-111111111111", 8.5, "POPULARITY_COLD_START"))
                ));

        List<java.util.UUID> result = recommendationClient.getRecommendedListingIds("   ", 3);

        assertThat(result).containsExactly(java.util.UUID.fromString("11111111-1111-1111-1111-111111111111"));
    }
}
