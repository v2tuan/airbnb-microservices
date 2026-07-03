package com.listingservice.service.Impl;

import com.listingservice.entity.AvailabilityCalendar;
import com.listingservice.entity.Listing;
import com.listingservice.mapper.IAvailabilityCalendarMapper;
import com.listingservice.repository.AvailabilityCalendarRepository;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.AvailabilityClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AvailabilityCalendarServiceTest {

  @Mock
  private AvailabilityCalendarRepository availabilityCalendarRepository;

  @Mock
  private ListingRepository listingRepository;

  @Mock
  private IAvailabilityCalendarMapper availabilityCalendarMapper;

  @Mock
  private AvailabilityClient availabilityClient;

  @InjectMocks
  private AvailabilityCalendarService availabilityCalendarService;

  @Test
  void getAvailability_shouldReturnMissingDatesAsUnavailable() {
    UUID listingId = UUID.randomUUID();
    LocalDate startDate = LocalDate.of(2026, 7, 1);
    LocalDate endDate = LocalDate.of(2026, 7, 3);

    Listing listing = Listing.builder().listingId(listingId).build();
    AvailabilityCalendar existing = AvailabilityCalendar.builder()
        .availabilityId(UUID.randomUUID())
        .listing(listing)
        .date(LocalDate.of(2026, 7, 1))
        .isAvailable(true)
        .build();

    when(listingRepository.existsById(listingId)).thenReturn(true);
    when(availabilityCalendarRepository.findByListingListingIdAndDateBetween(listingId, startDate, endDate))
        .thenReturn(List.of(existing));
    when(availabilityCalendarMapper.toResponse(existing)).thenReturn(
        com.listingservice.dto.response.AvailabilityResponse.builder()
            .availabilityId(existing.getAvailabilityId())
            .listingId(listingId)
            .date(existing.getDate())
            .isAvailable(existing.getIsAvailable())
            .build()
    );

    var response = availabilityCalendarService.getAvailability(listingId, startDate, endDate);

    assertThat(response).hasSize(3);
    assertThat(response.get(0).getDate()).isEqualTo(LocalDate.of(2026, 7, 1));
    assertThat(response.get(0).getIsAvailable()).isTrue();
    assertThat(response.get(1).getDate()).isEqualTo(LocalDate.of(2026, 7, 2));
    assertThat(response.get(1).getIsAvailable()).isFalse();
    assertThat(response.get(2).getDate()).isEqualTo(LocalDate.of(2026, 7, 3));
    assertThat(response.get(2).getIsAvailable()).isFalse();
  }
}
