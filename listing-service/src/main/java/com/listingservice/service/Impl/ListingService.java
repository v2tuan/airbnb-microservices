package com.listingservice.service.Impl;

import com.listingservice.constant.ListingStatus;
import com.listingservice.dto.request.ListingCreationRequest;
import com.listingservice.dto.request.ListingSuspensionRequest;
import com.listingservice.dto.request.ListingUnsuspensionRequest;
import com.listingservice.dto.request.ListingUpdateRequest;
import com.listingservice.dto.response.HomeListingCardResponse;
import com.listingservice.dto.response.HomeSectionResponse;
import com.listingservice.dto.response.ListingItemResponse;
import com.listingservice.dto.response.ListingResponse;
import com.listingservice.entity.Listing;
import com.listingservice.exception.AppException;
import com.listingservice.exception.ErrorCode;
import com.listingservice.mapper.IListingMapper;
import com.listingservice.repository.ListingRepository;
import com.listingservice.service.AvailabilityClient;
import com.listingservice.service.IListingService;
import com.listingservice.service.RatingClient;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ListingService implements IListingService {

    static int DEFAULT_SECTION_LIMIT = 10;
    static int MAX_SECTION_LIMIT = 20;

    ListingRepository listingRepository;
    IListingMapper listingMapper;
    RatingClient ratingClient;
    AvailabilityClient availabilityClient;

    @Override
    @Transactional
    public ListingResponse createListing(ListingCreationRequest request, String keycloakUserId) {
        log.info("Creating listing with title: {} for host: {}", request.getTitle(), keycloakUserId);

        Listing listing = listingMapper.toEntity(request);
        listing.setHostId(keycloakUserId);  // Set Keycloak user ID as hostId
        listing.setStatus(ListingStatus.DRAFT);
        validateCheckInWindow(listing);

        Listing savedListing = listingRepository.save(listing);
        log.info("Listing created with ID: {}", savedListing.getListingId());

        return listingMapper.toResponse(savedListing);
    }

    @Override
    @Transactional
    public ListingResponse updateListing(UUID listingId, ListingUpdateRequest request) {
        log.info("Updating listing ID: {}", listingId);

        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));

        listingMapper.updateEntity(listing, request);
        validateCheckInWindow(listing);

        Listing updatedListing = listingRepository.save(listing);
        log.info("Listing updated: {}", listingId);

        return listingMapper.toResponse(updatedListing);
    }

    @Override
    @Transactional
    public void deleteListing(UUID listingId) {
        log.info("Deleting listing ID: {}", listingId);

        if (!listingRepository.existsById(listingId)) {
            throw new AppException(ErrorCode.LISTING_NOT_FOUND);
        }

        listingRepository.deleteById(listingId);
        log.info("Listing deleted: {}", listingId);
    }

    @Override
    public ListingResponse getListingById(UUID listingId) {
        log.info("Getting listing by ID: {}", listingId);

        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));

        return listingMapper.toResponse(listing);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ListingResponse> getListingsByIds(List<UUID> listingIds) {

        if (listingIds == null || listingIds.isEmpty()) {
            return List.of();
        }

        log.info("Fetching listings by ids: {}", listingIds.size());

        List<Listing> listings = listingRepository.findByListingIdIn(listingIds);

        return listings.stream()
                .map(listingMapper::toResponse)
                .toList();
    }

    @Override
    public List<ListingResponse> getAllListings() {
        log.info("Getting all listings");

        return listingRepository.findAll().stream()
                .map(listingMapper::toResponse)
                .toList();
    }

    @Override
    public List<ListingResponse> getListingsByHost(String hostId) {
        log.info("Getting listings by host ID: {}", hostId);

        return listingRepository.findByHostId(hostId).stream()
                .map(listingMapper::toResponse)
                .toList();
    }

    @Override
    public List<ListingResponse> searchListings(String city, String country, Integer maxGuests, LocalDate checkIn, LocalDate checkOut) {
        log.info("Searching listings - City: {}, Country: {}, Max Guests: {}", city, country, maxGuests);

        List<Listing> listings = listingRepository.searchActiveListings(
                ListingStatus.ACTIVE,
                normalizeFilter(city),
                normalizeFilter(country),
                maxGuests);

        return filterAvailableForSearch(listings, checkIn, checkOut).stream()
                .map(listingMapper::toResponse)
                .toList();
    }

    @Override
    public List<ListingResponse> searchByPriceRange(BigDecimal minPrice, BigDecimal maxPrice, LocalDate checkIn, LocalDate checkOut) {
        log.info("Searching listings by price range: {} - {}", minPrice, maxPrice);

        return filterAvailableForSearch(
                listingRepository.findByPriceRangeAndStatus(minPrice, maxPrice, ListingStatus.ACTIVE),
                checkIn,
                checkOut
        )
                .stream()
                .map(listingMapper::toResponse)
                .toList();
    }

    @Override
    public List<ListingResponse> searchByLocation(BigDecimal latitude, BigDecimal longitude, Double radius, LocalDate checkIn, LocalDate checkOut) {
        log.info("Searching listings by location - Lat: {}, Lng: {}, Radius: {}km", latitude, longitude, radius);

        return filterAvailableForSearch(
                listingRepository.findByLocationWithinRadius(latitude, longitude, radius, ListingStatus.ACTIVE),
                checkIn,
                checkOut
        )
                .stream()
                .map(listingMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void activateListing(UUID listingId) {
        log.info("Activating listing ID: {}", listingId);

        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));

        listing.setStatus(ListingStatus.ACTIVE);
        listingRepository.save(listing);

        log.info("Listing activated: {}", listingId);
    }

    @Override
    @Transactional
    public void deactivateListing(UUID listingId) {
        log.info("Deactivating listing ID: {}", listingId);

        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));

        if (availabilityClient.hasActiveBookings(listingId)) {
            throw new AppException(ErrorCode.LISTING_HAS_ACTIVE_BOOKINGS);
        }

        listing.setStatus(ListingStatus.INACTIVE);
        listingRepository.save(listing);

        log.info("Listing deactivated: {}", listingId);
    }

    @Override
    @Transactional
    public void suspendListing(UUID listingId, ListingSuspensionRequest request) {
        log.info("Suspending listing ID: {} until {}", listingId, request.getSuspendedUntil());

        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));

        listing.setStatus(ListingStatus.SUSPENDED);
        listing.setSuspendedUntil(request.getSuspendedUntil());
        listing.setSuspensionReason(request.getReason());
        listingRepository.save(listing);

        log.info("Listing suspended: {}", listingId);
    }

    @Override
    @Transactional
    public void unsuspendListing(UUID listingId, ListingUnsuspensionRequest request) {
        log.info("Unsuspending listing ID: {}", listingId);

        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new AppException(ErrorCode.LISTING_NOT_FOUND));

        listing.setStatus(ListingStatus.ACTIVE);
        listing.setSuspendedUntil(null);
        listing.setSuspensionReason(null);
        listingRepository.save(listing);

        log.info("Listing unsuspended: {} reason={}", listingId, request.getReason());
    }

    @Override
    @Transactional(readOnly = true)
    public List<HomeSectionResponse> getHomeSections(Integer limitPerSection) {
        int safeLimit = normalizeLimit(limitPerSection);

        return List.of(
                buildSection("popular-hanoi", "Popular homes in Hanoi", "Hanoi", safeLimit),
                buildSection("dalat-weekend", "Available in Dalat this weekend", "Dalat", safeLimit)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ListingItemResponse> getListingsByHostPaginated(String hostId, ListingStatus status, String keyword, Pageable pageable) {
        log.info("Getting paginated listings for host: {}, status: {}, keyword: {}, page: {}, size: {}",
                hostId, status, keyword, pageable.getPageNumber(), pageable.getPageSize());

        String normalizedKeyword = keyword != null && !keyword.isBlank() ? keyword.trim() : null;
        Page<ListingItemResponse> listingsPage;
        if (normalizedKeyword != null) {
            listingsPage = listingRepository.findHostListingItemsByKeyword(
                    hostId,
                    status,
                    "%" + normalizedKeyword.toLowerCase() + "%",
                    pageable
            );
        } else if (status != null) {
            listingsPage = listingRepository.findHostListingItemsByStatus(hostId, status, pageable);
        } else {
            listingsPage = listingRepository.findHostListingItems(hostId, pageable);
        }

        List<UUID> listingIds = listingsPage.getContent().stream()
                .map(ListingItemResponse::getId)
                .filter(id -> id != null && !id.isBlank())
                .map(UUID::fromString)
                .toList();
        Map<String, RatingClient.ListingRatingSummary> ratingSummaries =
                ratingClient.getListingRatingSummaries(listingIds);

        listingsPage.getContent().forEach(item -> applyRatingSummary(
                item,
                ratingSummaries.get(item.getId())
        ));

        return listingsPage;
    }

    private HomeSectionResponse buildSection(String sectionKey, String title, String city, int limit) {
        List<HomeListingCardResponse> listings = listingRepository.findHomeCardsByCity(
                city,
                ListingStatus.ACTIVE,
                PageRequest.of(0, limit));

        return HomeSectionResponse.builder()
                .sectionKey(sectionKey)
                .title(title)
                .city(city)
                .listings(listings)
                .build();
    }

    private void applyRatingSummary(ListingItemResponse item, RatingClient.ListingRatingSummary ratingSummary) {
        RatingClient.ListingRatingSummary safeRatingSummary = ratingSummary != null
                ? ratingSummary
                : new RatingClient.ListingRatingSummary(BigDecimal.ZERO, 0L);

        item.setAvgRating(safeRatingSummary.getOverallRating().doubleValue());
        item.setReviewCount(safeRatingSummary.getReviewCount());
    }

    private int normalizeLimit(Integer limitPerSection) {
        if (limitPerSection == null || limitPerSection < 1) {
            return DEFAULT_SECTION_LIMIT;
        }

        return Math.min(limitPerSection, MAX_SECTION_LIMIT);
    }

    private boolean matchesIgnoreCase(String actual, String expected) {
        return expected == null || expected.isBlank()
                || actual != null && actual.equalsIgnoreCase(expected.trim());
    }

    private List<Listing> filterAvailableForSearch(List<Listing> listings, LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null || checkOut == null) {
            return listings;
        }

        if (!checkOut.isAfter(checkIn)) {
            return List.of();
        }

        Map<String, Boolean> availabilityByListingId = availabilityClient.getAvailability(
                listings.stream().map(Listing::getListingId).toList(),
                checkIn,
                checkOut);

        return listings.stream()
                .filter(listing -> availabilityByListingId.getOrDefault(listing.getListingId().toString(), true))
                .toList();
    }

    private String normalizeFilter(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validateCheckInWindow(Listing listing) {
        if (listing.getCheckInStartTime() == null || listing.getCheckInEndTime() == null) {
            return;
        }

        if (!listing.getCheckInStartTime().isBefore(listing.getCheckInEndTime())) {
            throw new AppException(ErrorCode.INVALID_CHECK_IN_TIME);
        }
    }
}
