package com.listingservice.service;

import com.listingservice.dto.response.RecentlyViewedItemResponse;
import com.listingservice.dto.response.RecentlyViewedResponse;
import com.listingservice.repository.client.RecentlyViewedServiceFeignClient;
import com.listingservice.repository.client.UserServiceFeignClient;
import com.listingservice.dto.response.PublicHostResponseDTO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecentlyViewedClientTest {

    @Mock
    RecentlyViewedServiceFeignClient recentlyViewedServiceFeignClient;

    @Mock
    UserServiceFeignClient userServiceFeignClient;

    @Test
    void blankUserIdFallsBackToAnonymousGlobalRecentViews() {
        RecentlyViewedClient recentlyViewedClient = new RecentlyViewedClient(
                recentlyViewedServiceFeignClient,
                userServiceFeignClient
        );

        when(recentlyViewedServiceFeignClient.getRecentlyViewed(eq("__anonymous__"), eq(4)))
                .thenReturn(new RecentlyViewedResponse(
                        "__anonymous__",
                        List.of(new RecentlyViewedItemResponse("22222222-2222-2222-2222-222222222222", Instant.parse("2026-06-28T03:00:00Z")))
                ));

        List<UUID> result = recentlyViewedClient.getRecentlyViewedListingIds(" ", 4);

        assertThat(result).containsExactly(UUID.fromString("22222222-2222-2222-2222-222222222222"));
    }

    @Test
    void fallsBackToLegacyUserIdWhenKeycloakHistoryIsEmpty() {
        RecentlyViewedClient recentlyViewedClient = new RecentlyViewedClient(
                recentlyViewedServiceFeignClient,
                userServiceFeignClient
        );

        when(recentlyViewedServiceFeignClient.getRecentlyViewed(eq("kc-123"), eq(4)))
                .thenReturn(new RecentlyViewedResponse("kc-123", List.of()));
        when(userServiceFeignClient.getPublicUser(eq("kc-123")))
                .thenReturn(new PublicHostResponseDTO(UUID.fromString("11111111-1111-1111-1111-111111111111"), "kc-123", "Host", null, false, null));
        when(recentlyViewedServiceFeignClient.getRecentlyViewed(eq("11111111-1111-1111-1111-111111111111"), eq(4)))
                .thenReturn(new RecentlyViewedResponse(
                        "11111111-1111-1111-1111-111111111111",
                        List.of(new RecentlyViewedItemResponse("33333333-3333-3333-3333-333333333333", Instant.parse("2026-06-28T03:00:00Z")))
                ));

        List<UUID> result = recentlyViewedClient.getRecentlyViewedListingIds("kc-123", 4);

        assertThat(result).containsExactly(UUID.fromString("33333333-3333-3333-3333-333333333333"));
    }
}
