package com.listingservice.service.Impl;

import com.listingservice.dto.response.CompositeListingResponse;
import com.listingservice.dto.response.PublicHostResponseDTO;
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
import java.time.Instant;
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
        .hostId("kc-host-1")
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
        .thenReturn(hostProfile("kc-host-1", "Nguyen Van A", "https://img.example/avatar.png"));
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
    assertNotNull(response.getHost());
    assertEquals("Nguyen Van A", response.getHost().getFullName());
    assertEquals("https://img.example/avatar.png", response.getHost().getAvatarUrl());
  }

  private CompositeListingResponse.HostProfileData hostProfile(String keycloakUserId, String fullName, String avatarUrl) {
    CompositeListingResponse.HostProfileData host = new CompositeListingResponse.HostProfileData();
    host.setUserId(null);
    host.setFullName(fullName);
    host.setAvatarUrl(avatarUrl);
    host.setSuperHost(Boolean.TRUE);
    host.setJoinedAt(Instant.parse("2025-01-01T00:00:00Z"));
    return host;
  }
}

