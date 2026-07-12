package com.listingservice.service.Impl;

import com.listingservice.constant.ActivityEventType;
import com.listingservice.constant.ListingStatus;
import com.listingservice.dto.response.HomeListingCardResponse;
import com.listingservice.dto.response.HomeSectionResponse;
import com.listingservice.entity.Listing;
import com.listingservice.entity.ListingPhoto;
import com.listingservice.entity.ListingPricing;
import com.listingservice.mapper.IListingMapper;
import com.listingservice.repository.ListingRepository;
import com.listingservice.repository.projection.HomeDestinationCardProjection;
import com.listingservice.repository.projection.HomeDestinationProjection;
import com.listingservice.service.ActivityClient;
import com.listingservice.service.AvailabilityClient;
import com.listingservice.service.RecommendationClient;
import com.listingservice.service.RatingClient;
import com.listingservice.service.RecentlyViewedClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ListingServiceRecommendationTest {

    @Mock
    ListingRepository listingRepository;

    @Mock
    IListingMapper listingMapper;

    @Mock
    ActivityClient activityClient;

    @Mock
    RecommendationClient recommendationClient;

    @Mock
    RecentlyViewedClient recentlyViewedClient;

    @Mock
    RatingClient ratingClient;

    @Mock
    AvailabilityClient availabilityClient;

    @InjectMocks
    ListingService listingService;

    @Test
    void getHomeSectionsShouldPutRecommendationFirstForAuthenticatedUser() {
        String userId = UUID.randomUUID().toString();
        UUID recommendedId = UUID.randomUUID();
        UUID recentlyViewedId = UUID.randomUUID();
        UUID losAngelesId = UUID.randomUUID();
        UUID austinId = UUID.randomUUID();

        when(recommendationClient.getRecommendedListingIds(userId, 10)).thenReturn(List.of(recommendedId));
        when(recentlyViewedClient.getRecentlyViewedListingIds(userId, 10)).thenReturn(List.of(recentlyViewedId));
        when(listingRepository.findByListingIdIn(List.of(recommendedId))).thenReturn(List.of(recommendedListing(recommendedId)));
        when(listingRepository.findByListingIdIn(List.of(recentlyViewedId))).thenReturn(List.of(recommendedListing(recentlyViewedId)));
        when(listingRepository.findTopActiveDestinations(eq(ListingStatus.ACTIVE.name()), any()))
                .thenReturn(List.of(
                        destination("Los Angeles", "United States"),
                        destination("Austin", "United States")
                ));
        when(listingRepository.findHomeCardsByDestinations(anyList(), eq("ACTIVE"), eq(8)))
                .thenReturn(List.of(
                        homeCard(losAngelesId, "Los Angeles stay", "Los Angeles", "United States"),
                        homeCard(austinId, "Austin stay", "Austin", "United States")
                ));
        when(ratingClient.getListingRatingSummaries(anyList())).thenReturn(Map.of(
                recommendedId.toString(), new RatingClient.ListingRatingSummary(new BigDecimal("4.90"), 27L),
                recentlyViewedId.toString(), new RatingClient.ListingRatingSummary(new BigDecimal("4.80"), 12L),
                losAngelesId.toString(), new RatingClient.ListingRatingSummary(new BigDecimal("4.70"), 11L),
                austinId.toString(), new RatingClient.ListingRatingSummary(new BigDecimal("4.50"), 8L)
        ));

        List<HomeSectionResponse> sections = listingService.getHomeSections(10, userId);

        assertThat(sections).hasSize(4);
        assertThat(sections.getFirst().getSectionKey()).isEqualTo("recommendations-for-you");
        assertThat(sections.getFirst().getViewAllHref()).isNull();
        assertThat(sections.getFirst().getHasMore()).isFalse();
        assertThat(sections.getFirst().getListings())
                .extracting(HomeListingCardResponse::getListingId)
                .containsExactly(recommendedId);
        assertThat(sections.getFirst().getListings().getFirst().getRating()).isEqualByComparingTo("4.90");
        assertThat(sections.get(1).getSectionKey()).isEqualTo("recently-viewed");
        assertThat(sections.get(1).getViewAllHref()).isNull();
        assertThat(sections.get(1).getHasMore()).isFalse();
        assertThat(sections.get(1).getListings())
                .extracting(HomeListingCardResponse::getListingId)
                .containsExactly(recentlyViewedId);
        assertThat(sections.get(2).getSectionKey()).isEqualTo("browse-los-angeles-united-states");
        assertThat(sections.get(2).getTitle()).contains("Los Angeles");
        assertThat(sections.get(2).getViewAllHref()).isEqualTo("/search?q=Los%20Angeles");
        assertThat(sections.get(2).getListings())
                .extracting(HomeListingCardResponse::getCity)
                .containsExactly("Los Angeles");
        assertThat(sections.get(3).getSectionKey()).isEqualTo("browse-austin-united-states");
        assertThat(sections.get(3).getTitle()).contains("Austin");
        assertThat(sections.get(3).getViewAllHref()).isEqualTo("/search?q=Austin");
        verify(recommendationClient).getRecommendedListingIds(userId, 10);
        verify(recentlyViewedClient).getRecentlyViewedListingIds(userId, 10);
    }

    @Test
    void getHomeSectionsShouldHidePersonalizedSectionsForAnonymousUser() {
        UUID losAngelesId = UUID.randomUUID();
        UUID austinId = UUID.randomUUID();

        when(listingRepository.findTopActiveDestinations(eq(ListingStatus.ACTIVE.name()), any()))
                .thenReturn(List.of(
                        destination("Los Angeles", "United States"),
                        destination("Austin", "United States")
                ));
        when(listingRepository.findHomeCardsByDestinations(anyList(), eq("ACTIVE"), eq(8)))
                .thenReturn(List.of(
                        homeCard(losAngelesId, "Los Angeles stay", "Los Angeles", "United States"),
                        homeCard(austinId, "Austin stay", "Austin", "United States")
                ));
        when(ratingClient.getListingRatingSummaries(anyList())).thenReturn(Map.of(
                losAngelesId.toString(), new RatingClient.ListingRatingSummary(new BigDecimal("4.70"), 11L),
                austinId.toString(), new RatingClient.ListingRatingSummary(new BigDecimal("4.50"), 8L)
        ));

        List<HomeSectionResponse> sections = listingService.getHomeSections(10, null);

        assertThat(sections).hasSize(2);
        assertThat(sections.getFirst().getSectionKey()).isEqualTo("browse-los-angeles-united-states");
        assertThat(sections.getFirst().getViewAllHref()).isEqualTo("/search?q=Los%20Angeles");
        assertThat(sections.get(1).getSectionKey()).isEqualTo("browse-austin-united-states");
        verifyNoInteractions(recommendationClient, recentlyViewedClient);
    }

    @Test
    void recordListingActivityDelegatesToActivityService() {
        UUID listingId = UUID.randomUUID();
        String userId = UUID.randomUUID().toString();

        listingService.recordListingActivity(listingId, userId, ActivityEventType.WISHLIST);

        verify(activityClient).recordActivity(userId, listingId, ActivityEventType.WISHLIST);
    }

    private Listing recommendedListing(UUID listingId) {
        return Listing.builder()
                .listingId(listingId)
                .title("Recommended home")
                .city("Da Lat")
                .country("Vietnam")
                .status(ListingStatus.ACTIVE)
                .maxGuests(4)
                .pricing(ListingPricing.builder()
                        .basePrice(new BigDecimal("1200000"))
                        .currency("VND")
                        .build())
                .photos(Set.of(ListingPhoto.builder()
                        .photoUrl("https://example.com/cover.jpg")
                        .displayOrder(0)
                        .isCover(true)
                        .build()))
                .build();
    }

    private HomeDestinationProjection destination(String city, String country) {
        return new HomeDestinationProjection() {
            @Override
            public String getCity() {
                return city;
            }

            @Override
            public String getCountry() {
                return country;
            }

            @Override
            public String getDestinationKey() {
                return (city + "|" + country).toLowerCase();
            }

            @Override
            public Long getListingCount() {
                return 2L;
            }
        };
    }

    private HomeDestinationCardProjection homeCard(UUID listingId, String title, String city, String country) {
        return new HomeDestinationCardProjection() {
            @Override
            public UUID getListingId() {
                return listingId;
            }

            @Override
            public String getTitle() {
                return title;
            }

            @Override
            public String getCity() {
                return city;
            }

            @Override
            public String getCountry() {
                return country;
            }

            @Override
            public String getCoverImageUrl() {
                return "https://example.com/card.jpg";
            }

            @Override
            public BigDecimal getBasePrice() {
                return new BigDecimal("900000");
            }

            @Override
            public String getCurrency() {
                return "USD";
            }

            @Override
            public Integer getMaxGuests() {
                return 2;
            }

            @Override
            public Boolean getInstantBook() {
                return Boolean.TRUE;
            }

            @Override
            public String getDestinationKey() {
                return (city + "|" + country).toLowerCase();
            }
        };
    }
}
