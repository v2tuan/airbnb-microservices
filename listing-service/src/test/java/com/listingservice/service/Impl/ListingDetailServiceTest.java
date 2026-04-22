package com.listingservice.service.Impl;

import com.listingservice.dto.response.CompositeListingResponse;
import com.listingservice.entity.Listing;
import com.listingservice.entity.ListingPricing;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.AvailabilityClient;
import com.listingservice.service.HostProfileClient;
import com.listingservice.service.RatingClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ListingDetailServiceTest {

  @Mock
  private ListingRepository listingRepository;

  @Mock
  private HostProfileClient hostProfileClient;

  @Mock
  private AvailabilityClient availabilityClient;

  @Mock
  private RatingClient ratingClient;

  @InjectMocks
  private ListingDetailService listingDetailService;

  @Test
  void getDetail_shouldIncludeAverageRating() {
    UUID listingId = UUID.randomUUID();
    LocalDate checkIn = LocalDate.of(2026, 4, 20);
    LocalDate checkOut = LocalDate.of(2026, 4, 22);

    ListingPricing pricing = ListingPricing.builder()
        .basePrice(new BigDecimal("100"))
        .cleaningFee(new BigDecimal("20"))
        .serviceFeePercentage(new BigDecimal("10"))
        .build();

    Listing listing = Listing.builder()
        .listingId(listingId)
        .hostId(UUID.randomUUID().toString())
        .title("Room with view")
        .description("Quiet and central")
        .address("1 Main Street")
        .city("Da Lat")
        .country("Vietnam")
        .pricing(pricing)
        .build();

    when(listingRepository.findById(listingId)).thenReturn(Optional.of(listing));
    when(availabilityClient.isAvailable(listingId, checkIn, checkOut)).thenReturn(true);
    when(hostProfileClient.getHostProfile(listing.getHostId()))
        .thenReturn(new CompositeListingResponse.HostProfileData());
    when(ratingClient.getAverageRating(listingId)).thenReturn(new BigDecimal("4.75"));

    CompositeListingResponse response = listingDetailService.getDetail(
        listingId,
        checkIn,
        checkOut,
        2,
        0,
        0,
        0);

    assertNotNull(response.getRating());
    assertEquals(new BigDecimal("4.75"), response.getRating().getAverage());
  }
}

