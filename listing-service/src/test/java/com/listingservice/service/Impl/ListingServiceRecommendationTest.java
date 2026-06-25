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
import com.listingservice.service.ActivityClient;
import com.listingservice.service.AvailabilityClient;
import com.listingservice.service.RecommendationClient;
import com.listingservice.service.RatingClient;
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
    RatingClient ratingClient;

    @Mock
    AvailabilityClient availabilityClient;

    @InjectMocks
    ListingService listingService;

    @Test
    void getHomeSectionsShouldPutRecommendationFirstForAuthenticatedUser() {
        String userId = UUID.randomUUID().toString();
        UUID recommendedId = UUID.randomUUID();
        UUID staticHanoiId = UUID.randomUUID();
        UUID staticDalatId = UUID.randomUUID();

        when(recommendationClient.getRecommendedListingIds(userId, 10)).thenReturn(List.of(recommendedId));
        when(listingRepository.findByListingIdIn(List.of(recommendedId))).thenReturn(List.of(recommendedListing(recommendedId)));
        when(listingRepository.findHomeCardsByCity(eq("Hanoi"), eq(ListingStatus.ACTIVE), any()))
                .thenReturn(List.of(homeCard(staticHanoiId, "Hanoi stay")));
        when(listingRepository.findHomeCardsByCity(eq("Dalat"), eq(ListingStatus.ACTIVE), any()))
                .thenReturn(List.of(homeCard(staticDalatId, "Dalat stay")));
        when(ratingClient.getListingRatingSummaries(anyList())).thenReturn(Map.of(
                recommendedId.toString(), new RatingClient.ListingRatingSummary(new BigDecimal("4.90"), 27L),
                staticHanoiId.toString(), new RatingClient.ListingRatingSummary(new BigDecimal("4.70"), 11L),
                staticDalatId.toString(), new RatingClient.ListingRatingSummary(new BigDecimal("4.50"), 8L)
        ));

        List<HomeSectionResponse> sections = listingService.getHomeSections(10, userId);

        assertThat(sections).hasSize(3);
        assertThat(sections.getFirst().getSectionKey()).isEqualTo("recommendations-for-you");
        assertThat(sections.getFirst().getListings())
                .extracting(HomeListingCardResponse::getListingId)
                .containsExactly(recommendedId);
        assertThat(sections.getFirst().getListings().getFirst().getRating()).isEqualByComparingTo("4.90");
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

    private HomeListingCardResponse homeCard(UUID listingId, String title) {
        return HomeListingCardResponse.builder()
                .listingId(listingId)
                .title(title)
                .city("Hanoi")
                .country("Vietnam")
                .coverImageUrl("https://example.com/card.jpg")
                .basePrice(new BigDecimal("900000"))
                .currency("VND")
                .maxGuests(2)
                .instantBook(Boolean.TRUE)
                .build();
    }
}
