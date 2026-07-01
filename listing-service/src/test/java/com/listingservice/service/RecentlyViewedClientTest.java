package com.listingservice.service;

import com.listingservice.dto.response.RecentlyViewedItemResponse;
import com.listingservice.dto.response.RecentlyViewedResponse;
import com.listingservice.repository.client.RecentlyViewedServiceFeignClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecentlyViewedClientTest {

    @Mock
    RecentlyViewedServiceFeignClient recentlyViewedServiceFeignClient;

    @Test
    void blankUserIdFallsBackToAnonymousGlobalRecentViews() {
        RecentlyViewedClient recentlyViewedClient = new RecentlyViewedClient(recentlyViewedServiceFeignClient);

        when(recentlyViewedServiceFeignClient.getRecentlyViewed(eq("__anonymous__"), eq(4)))
                .thenReturn(new RecentlyViewedResponse(
                        "__anonymous__",
                        List.of(new RecentlyViewedItemResponse("22222222-2222-2222-2222-222222222222", Instant.parse("2026-06-28T03:00:00Z")))
                ));

        List<java.util.UUID> result = recentlyViewedClient.getRecentlyViewedListingIds(" ", 4);

        assertThat(result).containsExactly(java.util.UUID.fromString("22222222-2222-2222-2222-222222222222"));
    }
}
