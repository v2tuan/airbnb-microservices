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
import com.listingservice.entity.ListingPhoto;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
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
    public Page<ListingItemResponse> getListingsByHostPaginated(String hostId, ListingStatus status, Pageable pageable) {
        log.info("Getting paginated listings for host: {}, status: {}, page: {}, size: {}",
                hostId, status, pageable.getPageNumber(), pageable.getPageSize());

        Page<Listing> listingsPage;
        if (status != null) {
            listingsPage = listingRepository.findByHostIdAndStatus(hostId, status, pageable);
        } else {
            listingsPage = listingRepository.findByHostId(hostId, pageable);
        }

        List<UUID> listingIds = listingsPage.getContent().stream()
                .map(Listing::getListingId)
                .toList();
        Map<String, RatingClient.ListingRatingSummary> ratingSummaries =
                ratingClient.getListingRatingSummaries(listingIds);

        List<ListingItemResponse> content = listingsPage.getContent().stream()
                .map(listing -> toListingItemResponse(
                        listing,
                        ratingSummaries.get(listing.getListingId().toString())))
                .toList();

        return new PageImpl<>(content, pageable, listingsPage.getTotalElements());
    }

    private HomeSectionResponse buildSection(String sectionKey, String title, String city, int limit) {
        List<HomeListingCardResponse> listings = listingRepository
                .findByCityIgnoreCaseAndStatusOrderByInstantBookDescCreatedAtDesc(
                        city,
                        ListingStatus.ACTIVE,
                        PageRequest.of(0, limit))
                .stream()
                .map(this::safeToHomeCard)
                .filter(java.util.Objects::nonNull)
                .toList();

        return HomeSectionResponse.builder()
                .sectionKey(sectionKey)
                .title(title)
                .city(city)
                .listings(listings)
                .build();
    }

    private HomeListingCardResponse safeToHomeCard(Listing listing) {
        try {
            return toHomeCard(listing);
        } catch (Exception ex) {
            log.warn("Skip invalid listing in home section. listingId={}", listing.getListingId(), ex);
            return null;
        }
    }

    private HomeListingCardResponse toHomeCard(Listing listing) {
        return HomeListingCardResponse.builder()
                .listingId(listing.getListingId())
                .title(listing.getTitle())
                .city(listing.getCity())
                .country(listing.getCountry())
                .coverImageUrl(resolveCoverImageUrl(listing))
                .basePrice(listing.getPricing() != null ? listing.getPricing().getBasePrice() : null)
                .rating(resolveBasicRating(listing))
                .currency(listing.getPricing() != null ? listing.getPricing().getCurrency() : null)
                .maxGuests(listing.getMaxGuests())
                .instantBook(listing.getInstantBook())
                .build();
    }

    private ListingItemResponse toListingItemResponse(Listing listing) {
        return toListingItemResponse(listing, ratingClient.getListingRatingSummary(listing.getListingId()));
    }

    private ListingItemResponse toListingItemResponse(Listing listing, RatingClient.ListingRatingSummary ratingSummary) {
        RatingClient.ListingRatingSummary safeRatingSummary = ratingSummary != null
                ? ratingSummary
                : new RatingClient.ListingRatingSummary(BigDecimal.ZERO, 0L);

        return ListingItemResponse.builder()
                .id(listing.getListingId().toString())
                .title(listing.getTitle())
                .thumbnailUrl(resolveCoverImageUrl(listing))
                .city(listing.getCity())
                .country(listing.getCountry())
                .propertyType(listing.getPropertyType())
                .status(listing.getStatus())
                .createdAt(listing.getCreatedAt())
                .shortFeatures(buildShortFeatures(listing))
            .avgRating(safeRatingSummary.getOverallRating().doubleValue())
            .reviewCount(safeRatingSummary.getReviewCount())
                .build();
    }

    private String buildShortFeatures(Listing listing) {
        List<String> features = new java.util.ArrayList<>();

        if (listing.getListingAmenities() != null && !listing.getListingAmenities().isEmpty()) {
            // Take first few amenities
            listing.getListingAmenities().stream()
                    .limit(3)
                    .forEach(amenity -> features.add(amenity.getAmenity().getName()));
        }

        return String.join("/", features);
    }

    private BigDecimal resolveBasicRating(Listing listing) {
        if (listing.getListingId() == null) {
            return new BigDecimal("4.80");
        }

        long hash = Math.abs(listing.getListingId().getLeastSignificantBits());
        double normalized = (hash % 51) / 100.0; // range: 0.00 -> 0.50

        return BigDecimal.valueOf(4.50 + normalized).setScale(2, RoundingMode.HALF_UP);
    }

    private String resolveCoverImageUrl(Listing listing) {
        if (listing.getPhotos() == null || listing.getPhotos().isEmpty()) {
            return null;
        }

        return listing.getPhotos().stream()
                .sorted(Comparator
                        .comparing((ListingPhoto photo) -> !Boolean.TRUE.equals(photo.getIsCover()))
                        .thenComparing(ListingPhoto::getDisplayOrder, Comparator.nullsLast(Integer::compareTo)))
                .map(ListingPhoto::getPhotoUrl)
                .findFirst()
                .orElse(null);
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
