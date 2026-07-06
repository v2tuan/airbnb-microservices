package com.listingservice.service;

import com.listingservice.dto.response.RecommendationItemResponse;
import com.listingservice.dto.response.RecommendationResponse;
import com.listingservice.repository.client.RecommendationServiceFeignClient;
import com.listingservice.repository.client.UserServiceFeignClient;
import com.listingservice.dto.response.PublicHostResponseDTO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecommendationClientTest {

    @Mock
    RecommendationServiceFeignClient recommendationServiceFeignClient;

    @Mock
    UserServiceFeignClient userServiceFeignClient;

    @Test
    void blankUserIdFallsBackToAnonymousPopularityRecommendation() {
        RecommendationClient recommendationClient = new RecommendationClient(
                recommendationServiceFeignClient,
                userServiceFeignClient
        );

        when(recommendationServiceFeignClient.recommendForUser(eq("__anonymous__"), eq(3)))
                .thenReturn(new RecommendationResponse(
                        "__anonymous__",
                        List.of(new RecommendationItemResponse("11111111-1111-1111-1111-111111111111", 8.5, "POPULARITY_COLD_START"))
                ));

        List<UUID> result = recommendationClient.getRecommendedListingIds("   ", 3);

        assertThat(result).containsExactly(UUID.fromString("11111111-1111-1111-1111-111111111111"));
    }

    @Test
    void fallsBackToLegacyUserIdWhenKeycloakRecommendationsAreEmpty() {
        RecommendationClient recommendationClient = new RecommendationClient(
                recommendationServiceFeignClient,
                userServiceFeignClient
        );

        when(recommendationServiceFeignClient.recommendForUser(eq("kc-456"), eq(3)))
                .thenReturn(new RecommendationResponse("kc-456", List.of()));
        when(userServiceFeignClient.getPublicUser(eq("kc-456")))
                .thenReturn(new PublicHostResponseDTO(UUID.fromString("22222222-2222-2222-2222-222222222222"), "kc-456", "Host", null, false, null));
        when(recommendationServiceFeignClient.recommendForUser(eq("22222222-2222-2222-2222-222222222222"), eq(3)))
                .thenReturn(new RecommendationResponse(
                        "22222222-2222-2222-2222-222222222222",
                        List.of(new RecommendationItemResponse("33333333-3333-3333-3333-333333333333", 7.2, "POPULARITY_BACKFILL"))
                ));

        List<UUID> result = recommendationClient.getRecommendedListingIds("kc-456", 3);

        assertThat(result).containsExactly(UUID.fromString("33333333-3333-3333-3333-333333333333"));
    }
}
