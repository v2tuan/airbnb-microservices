package com.listingservice.service.Impl;

import com.listingservice.constant.ListingStatus;
import com.listingservice.dto.request.ListingFilterRequest;
import com.listingservice.dto.response.ListingResponse;
import com.listingservice.entity.Listing;
import com.listingservice.mapper.IListingMapper;
import com.listingservice.repository.ListingRepository;
import com.listingservice.search.ListingSearchCriteria;
import com.listingservice.service.AvailabilityClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
        Listing activeOtherCity = listing("Dalat", "Vietnam", 2);
        when(listingRepository.searchActiveListings(ListingStatus.ACTIVE, "hanoi", "vietnam", 2))
            .thenReturn(List.of(activeMatch, activeOtherCity));
        when(listingMapper.toResponse(any())).thenAnswer(invocation -> response(invocation.getArgument(0)));

        List<ListingResponse> results = listingService.searchListings(
            "hanoi",
            "vietnam",
            2,
            null,
            null,
            null,
            null,
            null,
            null,
            null);

        assertThat(results).hasSize(1);
        assertThat(results.getFirst().getListingId()).isEqualTo(activeMatch.getListingId());
        verify(listingRepository).searchActiveListings(ListingStatus.ACTIVE, "hanoi", "vietnam", 2);
        verify(availabilityClient, never()).getAvailability(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
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
            checkOut)).thenReturn(Map.of(
            available.getListingId().toString(), true,
            unavailable.getListingId().toString(), false));
        when(listingMapper.toResponse(any())).thenAnswer(invocation -> response(invocation.getArgument(0)));

        List<ListingResponse> results = listingService.searchListings(
            "Hanoi",
            null,
            1,
            null,
            null,
            null,
            null,
            null,
            checkIn,
            checkOut);

        assertThat(results).extracting(ListingResponse::getListingId).containsExactly(available.getListingId());
        verify(availabilityClient).getAvailability(List.of(available.getListingId(), unavailable.getListingId()), checkIn, checkOut);
    }

    @Test
    void searchListingsWithFiltersUsesIdOnlySearchAndPreservesCandidateOrder() {
        Listing first = listing("Hanoi", "Vietnam", 2);
        Listing second = listing("Hanoi", "Vietnam", 4);
        ListingFilterRequest request = ListingFilterRequest.builder()
                .city("Hanoi")
                .limit(6)
                .build();

        List<UUID> candidateIds = List.of(second.getListingId(), first.getListingId());
        when(listingRepository.findCandidateIds(any())).thenReturn(candidateIds);
        when(listingRepository.findByListingIdIn(candidateIds)).thenReturn(List.of(first, second));
        when(listingMapper.toResponse(any())).thenAnswer(invocation -> response(invocation.getArgument(0)));

        List<ListingResponse> results = listingService.searchListingsWithFilters(request);

        assertThat(results)
                .extracting(ListingResponse::getListingId)
                .containsExactly(second.getListingId(), first.getListingId());

        ArgumentCaptor<ListingSearchCriteria> criteriaCaptor = ArgumentCaptor.forClass(ListingSearchCriteria.class);
        verify(listingRepository).findCandidateIds(criteriaCaptor.capture());
        assertThat(criteriaCaptor.getValue().city()).isEqualTo("Hanoi");
        assertThat(criteriaCaptor.getValue().limit()).isEqualTo(6);
        verify(listingRepository).findByListingIdIn(candidateIds);
        verify(listingRepository, never()).findAll(any(Specification.class), any(Pageable.class));
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
