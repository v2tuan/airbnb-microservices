package com.listingservice.service.Impl;

import com.listingservice.constant.ListingStatus;
import com.listingservice.dto.request.ListingFilterRequest;
import com.listingservice.dto.response.ListingResponse;
import com.listingservice.entity.Listing;
import com.listingservice.mapper.IListingMapper;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.AvailabilityClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ListingServiceSearchV2Test {

    @Mock
    ListingRepository listingRepository;

    @Mock
    IListingMapper listingMapper;

    @Mock
    AvailabilityClient availabilityClient;

    @InjectMocks
    ListingService listingService;

    @Test
    void searchListingsUsesOnlyActiveListingsAndDoesNotUseLegacyStatusQueries() {
        Listing activeMatch = listing("Hanoi", "Vietnam", 2);
        when(listingRepository.searchActiveListings(ListingStatus.ACTIVE, "hanoi", "vietnam", 2))
                .thenReturn(List.of(activeMatch));
        when(listingMapper.toResponse(activeMatch)).thenReturn(response(activeMatch));

        List<ListingResponse> results = listingService.searchListings("hanoi", "vietnam", 2, null, null);

        assertThat(results).hasSize(1);
        assertThat(results.getFirst().getListingId()).isEqualTo(activeMatch.getListingId());
        verify(listingRepository).searchActiveListings(ListingStatus.ACTIVE, "hanoi", "vietnam", 2);
        verify(listingRepository, never()).findByStatus(ListingStatus.ACTIVE);
        verify(listingRepository, never()).findByCity("hanoi");
        verify(listingRepository, never()).findByCityAndCountry("hanoi", "vietnam");
        verify(availabilityClient, never()).getAvailability(
                org.mockito.ArgumentMatchers.anyList(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        );
        verify(availabilityClient, never()).isAvailable(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void searchListingsFiltersUnavailableListingsWhenDateRangeIsProvided() {
        LocalDate checkIn = LocalDate.of(2026, 7, 10);
        LocalDate checkOut = LocalDate.of(2026, 7, 12);
        Listing available = listing("Hanoi", "Vietnam", 2);
        Listing unavailable = listing("Hanoi", "Vietnam", 2);
        when(listingRepository.searchActiveListings(ListingStatus.ACTIVE, "Hanoi", null, 1))
                .thenReturn(List.of(available, unavailable));
        when(availabilityClient.getAvailability(
                List.of(available.getListingId(), unavailable.getListingId()),
                checkIn,
                checkOut
        )).thenReturn(Map.of(
                available.getListingId().toString(), true,
                unavailable.getListingId().toString(), false
        ));
        when(listingMapper.toResponse(available)).thenReturn(response(available));

        List<ListingResponse> results = listingService.searchListings("Hanoi", null, 1, checkIn, checkOut);

        assertThat(results).extracting(ListingResponse::getListingId).containsExactly(available.getListingId());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<UUID>> listingIdsCaptor = ArgumentCaptor.forClass(List.class);
        verify(availabilityClient).getAvailability(
                listingIdsCaptor.capture(),
                org.mockito.Mockito.eq(checkIn),
                org.mockito.Mockito.eq(checkOut)
        );
        assertThat(listingIdsCaptor.getValue()).containsExactly(available.getListingId(), unavailable.getListingId());
    }

    @Test
    void searchListingsWithFiltersRejectsInvalidPriceRange() {
        ListingFilterRequest request = ListingFilterRequest.builder()
                .minPrice(BigDecimal.valueOf(200))
                .maxPrice(BigDecimal.valueOf(100))
                .build();

        List<ListingResponse> results = listingService.searchListingsWithFilters(request);

        assertThat(results).isEmpty();
        verify(listingRepository, never()).findAll(org.mockito.ArgumentMatchers.<Specification<Listing>>any());
    }

    @Test
    void searchListingsWithFiltersUsesSpecificationSearchAndBatchAvailability() {
        LocalDate checkIn = LocalDate.of(2026, 8, 1);
        LocalDate checkOut = LocalDate.of(2026, 8, 3);
        Listing available = listing("Hanoi", "Vietnam", 2);
        Listing unavailable = listing("Hanoi", "Vietnam", 2);
        ListingFilterRequest request = ListingFilterRequest.builder()
                .city("Hanoi")
                .guests(2)
                .checkIn(checkIn)
                .checkOut(checkOut)
                .limit(10)
                .build();

        when(listingRepository.findAll(org.mockito.ArgumentMatchers.<Specification<Listing>>any()))
                .thenReturn(List.of(available, unavailable));
        when(availabilityClient.getAvailability(
                List.of(available.getListingId(), unavailable.getListingId()),
                checkIn,
                checkOut
        )).thenReturn(Map.of(
                available.getListingId().toString(), true,
                unavailable.getListingId().toString(), false
        ));
        when(listingMapper.toResponse(available)).thenReturn(response(available));

        List<ListingResponse> results = listingService.searchListingsWithFilters(request);

        assertThat(results).extracting(ListingResponse::getListingId).containsExactly(available.getListingId());
        verify(listingRepository).findAll(org.mockito.ArgumentMatchers.<Specification<Listing>>any());
        verify(availabilityClient).getAvailability(
                List.of(available.getListingId(), unavailable.getListingId()),
                checkIn,
                checkOut
        );
    }

    private Listing listing(String city, String country, int maxGuests) {
        return Listing.builder()
                .listingId(UUID.randomUUID())
                .city(city)
                .country(country)
                .maxGuests(maxGuests)
                .status(ListingStatus.ACTIVE)
                .build();
    }

    private ListingResponse response(Listing listing) {
        return ListingResponse.builder()
                .listingId(listing.getListingId())
                .city(listing.getCity())
                .country(listing.getCountry())
                .maxGuests(listing.getMaxGuests())
                .status(listing.getStatus())
                .build();
    }
}
