package com.listingservice.service.Impl;

import com.listingservice.constant.ListingStatus;
import com.listingservice.constant.ActivityEventType;
import com.listingservice.dto.request.ListingCreationRequest;
import com.listingservice.dto.request.ListingFilterRequest;
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
import com.listingservice.search.ListingSearchCriteria;
import com.listingservice.search.ListingSearchSort;
import com.listingservice.service.ActivityClient;
import com.listingservice.service.AvailabilityClient;
import com.listingservice.service.IListingService;
import com.listingservice.service.RecommendationClient;
import com.listingservice.service.RatingClient;
import com.listingservice.service.RecentlyViewedClient;
import jakarta.persistence.criteria.Predicate;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;
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
    ActivityClient activityClient;
    RecommendationClient recommendationClient;
    RecentlyViewedClient recentlyViewedClient;
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
        ListingResponse response = listingMapper.toResponse(listing);
        return response;
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
    @Transactional(readOnly = true)
    public Page<ListingResponse> getAdminListings(ListingStatus status, String keyword, Pageable pageable) {
        String normalizedKeyword = normalizeFilter(keyword);

        log.info("Getting admin listings status={}, keyword={}, page={}, size={}",
                status, normalizedKeyword, pageable.getPageNumber(), pageable.getPageSize());

        return listingRepository.findAll(adminListingSpecification(status, normalizedKeyword), pageable)
                .map(listingMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ListingItemResponse> getAdminListingItems(ListingStatus status, String keyword, Pageable pageable) {
        String normalizedKeyword = normalizeFilter(keyword);

        log.info("Getting compact admin listings status={}, keyword={}, page={}, size={}",
                status, normalizedKeyword, pageable.getPageNumber(), pageable.getPageSize());

        if (normalizedKeyword != null) {
            return listingRepository.findAdminListingItemsByKeyword(
                    status,
                    "%" + normalizedKeyword.toLowerCase(Locale.ROOT) + "%",
                    pageable
            );
        }

        if (status != null) {
            return listingRepository.findAdminListingItemsByStatus(status, pageable);
        }

        return listingRepository.findAdminListingItems(pageable);
    }

    @Override
    public List<ListingResponse> getListingsByHost(String hostId) {
        log.info("Getting listings by host ID: {}", hostId);

        return listingRepository.findByHostId(hostId).stream()
                .map(listingMapper::toResponse)
                .toList();
    }

    @Override
        public List<ListingResponse> searchListings(
            String city,
            String country,
            Integer maxGuests,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal latitude,
            BigDecimal longitude,
            Double radius,
            LocalDate checkIn,
            LocalDate checkOut) {
        log.info("Searching listings - City: {}, Country: {}, Max Guests: {}, Min Price: {}, Max Price: {}, Latitude: {}, Longitude: {}, Radius: {}",
            city, country, maxGuests, minPrice, maxPrice, latitude, longitude, radius);

        List<Listing> listings;

        if (latitude != null && longitude != null) {
            listings = listingRepository.findByLocationWithinRadius(latitude, longitude, radius != null ? radius : 25.0, ListingStatus.ACTIVE);
        } else if (minPrice != null && maxPrice != null) {
            listings = listingRepository.findByPriceRangeAndStatus(minPrice, maxPrice, ListingStatus.ACTIVE);
        } else {
            listings = listingRepository.searchActiveListings(
                ListingStatus.ACTIVE,
                normalizeFilter(city),
                normalizeFilter(country),
                maxGuests);
        }

        return filterAvailableForSearch(
            filterBySearchCriteria(listings, city, country, maxGuests, minPrice, maxPrice),
            checkIn,
            checkOut)
            .stream()
                .map(listingMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ListingResponse> searchListingsWithFilters(ListingFilterRequest request) {
        ListingFilterRequest safeRequest = request != null ? request : new ListingFilterRequest();

        log.info(
                "Advanced listing search - keyword={}, city={}, country={}, guests={}, price={}..{}, propertyTypes={}, roomTypes={}, checkIn={}, checkOut={}, limit={}",
                safeRequest.getKeyword(),
                safeRequest.getCity(),
                safeRequest.getCountry(),
                safeRequest.getGuests(),
                safeRequest.getMinPrice(),
                safeRequest.getMaxPrice(),
                safeRequest.getPropertyTypes(),
                safeRequest.getRoomTypes(),
                safeRequest.getCheckIn(),
                safeRequest.getCheckOut(),
                safeRequest.getLimit()
        );

        if (hasInvalidPriceRange(safeRequest)) {
            return List.of();
        }

        int limit = normalizeSearchLimit(safeRequest.getLimit());
        ListingSearchCriteria searchCriteria = ListingSearchCriteria.from(safeRequest, limit);
        List<UUID> candidateIds = listingRepository.findCandidateIds(searchCriteria);

        if (candidateIds.isEmpty()) {
            return List.of();
        }

        List<Listing> candidates = findListingsByIdsPreservingOrder(candidateIds);

        // Availability belongs to booking-service in this architecture. Listing-service
        // owns listing attributes, then asks booking-service which candidates are free
        // for the requested date range.
        List<Listing> availableListings = filterAvailableForSearch(
                candidates,
                safeRequest.getCheckIn(),
                safeRequest.getCheckOut()
        );

        return filterByAmenities(
                filterByRadius(
                        availableListings,
                        safeRequest.getLatitude(),
                        safeRequest.getLongitude(),
                        safeRequest.getRadiusKm()
                ),
                safeRequest.getAmenityIds(),
                safeRequest.getAmenityNames()
        )
                .stream()
                .sorted(advancedSearchComparator(safeRequest.getSortBy()))
                .limit(limit)
                .map(listingMapper::toResponse)
                .toList();
    }

    private List<Listing> findListingsByIdsPreservingOrder(List<UUID> listingIds) {
        if (listingIds == null || listingIds.isEmpty()) {
            return List.of();
        }

        Map<UUID, Listing> listingsById = listingRepository.findByListingIdIn(listingIds)
                .stream()
                .collect(Collectors.toMap(
                        Listing::getListingId,
                        listing -> listing,
                        (left, right) -> left
                ));

        return listingIds.stream()
                .map(listingsById::get)
                .filter(Objects::nonNull)
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
    public List<HomeSectionResponse> getHomeSections(Integer limitPerSection, String keycloakUserId) {
        int safeLimit = normalizeLimit(limitPerSection);
        List<HomeSectionResponse> sections = new java.util.ArrayList<>();

        if (hasKeycloakUserId(keycloakUserId)) {
            buildRecommendationSection(keycloakUserId, safeLimit).ifPresent(sections::add);
            buildRecentlyViewedSection(keycloakUserId, safeLimit).ifPresent(sections::add);
        }
        sections.addAll(List.of(
                buildSection("popular-hanoi", "Popular homes in Hanoi", "Hanoi", safeLimit),
                buildSection("dalat-weekend", "Available in Dalat this weekend", "Dalat", safeLimit)
        ));

        return sections;
    }

    @Override
    public void recordListingActivity(UUID listingId, String keycloakUserId, ActivityEventType eventType) {
        activityClient.recordActivity(keycloakUserId, listingId, eventType);
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

        return listingsPage;
    }

    private HomeSectionResponse buildSection(String sectionKey, String title, String city, int limit) {
        List<HomeListingCardResponse> listings = listingRepository.findHomeCardsByCity(
                city,
                ListingStatus.ACTIVE,
                PageRequest.of(0, limit));

        applyRatings(listings);

        return HomeSectionResponse.builder()
                .sectionKey(sectionKey)
                .title(title)
                .city(city)
                .listings(listings)
                .build();
    }

    private Optional<HomeSectionResponse> buildRecommendationSection(String userId, int limit) {
        List<UUID> recommendedIds = recommendationClient.getRecommendedListingIds(userId, limit);
        if (recommendedIds.isEmpty()) {
            return Optional.empty();
        }

        Map<UUID, Listing> listingsById = listingRepository.findByListingIdIn(recommendedIds).stream()
                .filter(listing -> listing.getStatus() == ListingStatus.ACTIVE)
                .collect(Collectors.toMap(
                        Listing::getListingId,
                        listing -> listing,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        List<HomeListingCardResponse> cards = recommendedIds.stream()
                .map(listingsById::get)
                .filter(Objects::nonNull)
                .map(this::toHomeCard)
                .toList();

        if (cards.isEmpty()) {
            return Optional.empty();
        }

        applyRatings(cards);

        return Optional.of(HomeSectionResponse.builder()
                .sectionKey("recommendations-for-you")
                .title("Recommended for you")
                .city(null)
                .listings(cards)
                .build());
    }

    private Optional<HomeSectionResponse> buildRecentlyViewedSection(String userId, int limit) {
        List<UUID> recentlyViewedIds = recentlyViewedClient.getRecentlyViewedListingIds(userId, limit);
        if (recentlyViewedIds.isEmpty()) {
            return Optional.empty();
        }

        Map<UUID, Listing> listingsById = listingRepository.findByListingIdIn(recentlyViewedIds).stream()
                .filter(listing -> listing.getStatus() == ListingStatus.ACTIVE)
                .collect(Collectors.toMap(
                        Listing::getListingId,
                        listing -> listing,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));

        List<HomeListingCardResponse> cards = recentlyViewedIds.stream()
                .map(listingsById::get)
                .filter(Objects::nonNull)
                .map(this::toHomeCard)
                .toList();

        if (cards.isEmpty()) {
            return Optional.empty();
        }

        applyRatings(cards);

        return Optional.of(HomeSectionResponse.builder()
                .sectionKey("recently-viewed")
                .title("Recently viewed")
                .city(null)
                .listings(cards)
                .build());
    }

    private HomeListingCardResponse toHomeCard(Listing listing) {
        return HomeListingCardResponse.builder()
                .listingId(listing.getListingId())
                .title(listing.getTitle())
                .city(listing.getCity())
                .country(listing.getCountry())
                .coverImageUrl(resolveCoverImageUrl(listing))
                .basePrice(listing.getPricing() != null ? listing.getPricing().getBasePrice() : null)
                .rating(null)
                .currency(listing.getPricing() != null ? listing.getPricing().getCurrency() : null)
                .maxGuests(listing.getMaxGuests())
                .instantBook(listing.getInstantBook())
                .build();
    }

    private void applyRatings(List<HomeListingCardResponse> listings) {
        if (listings == null || listings.isEmpty()) {
            return;
        }

        List<UUID> listingIds = listings.stream()
                .map(HomeListingCardResponse::getListingId)
                .filter(Objects::nonNull)
                .toList();
        Map<String, RatingClient.ListingRatingSummary> ratingSummaries = ratingClient.getListingRatingSummaries(listingIds);

        listings.forEach(item -> {
            RatingClient.ListingRatingSummary ratingSummary = ratingSummaries.get(
                    item.getListingId() != null ? item.getListingId().toString() : null);
            BigDecimal rating = ratingSummary != null ? ratingSummary.getOverallRating() : BigDecimal.ZERO;
            item.setRating(rating);
        });
    }

    private String resolveCoverImageUrl(Listing listing) {
        if (listing == null || listing.getPhotos() == null || listing.getPhotos().isEmpty()) {
            return null;
        }

        return listing.getPhotos().stream()
                .filter(Objects::nonNull)
                .sorted(Comparator
                        .comparing((ListingPhoto photo) -> !Boolean.TRUE.equals(photo.getIsCover()))
                        .thenComparing(photo -> photo.getDisplayOrder() == null ? Integer.MAX_VALUE : photo.getDisplayOrder()))
                .map(ListingPhoto::getPhotoUrl)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }

    private void applyRatingSummary(ListingItemResponse item, RatingClient.ListingRatingSummary ratingSummary) {
        RatingClient.ListingRatingSummary safeRatingSummary = ratingSummary != null
                ? ratingSummary
                : new RatingClient.ListingRatingSummary(BigDecimal.ZERO, 0L);

        item.setAvgRating(safeRatingSummary.getOverallRating().doubleValue());
        item.setReviewCount(safeRatingSummary.getReviewCount());
    }

    private List<Listing> filterByAmenities(
            List<Listing> listings,
            List<UUID> amenityIds,
            List<String> amenityNames
    ) {
        Set<UUID> requiredAmenityIds = amenityIds == null
                ? Set.of()
                : amenityIds.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        Set<String> requiredAmenityNames = amenityNames == null
                ? Set.of()
                : amenityNames.stream()
                .map(this::normalizeFilter)
                .filter(Objects::nonNull)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        if (requiredAmenityIds.isEmpty() && requiredAmenityNames.isEmpty()) {
            return listings;
        }

        // Amenity matching uses "contains all" semantics because users usually mean
        // "has wifi and pool", not "has any of wifi or pool".
        return listings.stream()
                .filter(listing -> listingHasAllAmenities(listing, requiredAmenityIds, requiredAmenityNames))
                .toList();
    }

    private boolean listingHasAllAmenities(
            Listing listing,
            Set<UUID> requiredAmenityIds,
            Set<String> requiredAmenityNames
    ) {
        if (listing.getListingAmenities() == null) {
            return requiredAmenityIds.isEmpty() && requiredAmenityNames.isEmpty();
        }

        Set<UUID> listingAmenityIds = listing.getListingAmenities()
                .stream()
                .map(listingAmenity -> listingAmenity.getAmenity() != null
                        ? listingAmenity.getAmenity().getAmenityId()
                        : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<String> listingAmenityNames = listing.getListingAmenities()
                .stream()
                .map(listingAmenity -> listingAmenity.getAmenity() != null
                        ? listingAmenity.getAmenity().getName()
                        : null)
                .map(this::normalizeFilter)
                .filter(Objects::nonNull)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        return listingAmenityIds.containsAll(requiredAmenityIds)
                && listingAmenityNames.containsAll(requiredAmenityNames);
    }

    private List<Listing> filterByRadius(
            List<Listing> listings,
            BigDecimal latitude,
            BigDecimal longitude,
            Double radiusKm
    ) {
        if (latitude == null || longitude == null || radiusKm == null) {
            return listings;
        }

        return listings.stream()
                .filter(listing -> listing.getLatitude() != null && listing.getLongitude() != null)
                .filter(listing -> distanceKm(
                        latitude.doubleValue(),
                        longitude.doubleValue(),
                        listing.getLatitude().doubleValue(),
                        listing.getLongitude().doubleValue()
                ) <= radiusKm)
                .toList();
    }

    private double distanceKm(double latitude, double longitude, double listingLatitude, double listingLongitude) {
        double earthRadiusKm = 6371.0;
        double latitudeDelta = Math.toRadians(listingLatitude - latitude);
        double longitudeDelta = Math.toRadians(listingLongitude - longitude);
        double startLatitude = Math.toRadians(latitude);
        double endLatitude = Math.toRadians(listingLatitude);

        double haversine = Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2)
                + Math.cos(startLatitude) * Math.cos(endLatitude)
                * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);

        return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    }

    private Comparator<Listing> advancedSearchComparator(String sortBy) {
        ListingSearchSort sort = ListingSearchSort.from(sortBy);

        return switch (sort) {
            case PRICE_ASC -> Comparator.comparing(this::basePriceOrMax);
            case PRICE_DESC -> Comparator.comparing(this::basePriceOrMin).reversed();
            case CREATED_ASC -> Comparator.comparing(this::createdAtOrMin);
            case CREATED_DESC -> Comparator.comparing(this::createdAtOrMin).reversed();
            case GUESTS_DESC -> Comparator.comparing(this::maxGuestsOrZero).reversed()
                    .thenComparing(this::createdAtOrMin, Comparator.reverseOrder());
            case RELEVANCE -> Comparator.comparing(this::instantBookRank)
                    .thenComparing(this::createdAtOrMin, Comparator.reverseOrder());
        };
    }

    private boolean hasInvalidPriceRange(ListingFilterRequest request) {
        return request.getMinPrice() != null
                && request.getMaxPrice() != null
                && request.getMinPrice().compareTo(request.getMaxPrice()) > 0;
    }

    private int normalizeSearchLimit(Integer limit) {
        if (limit == null || limit < 1) {
            return 50;
        }

        return Math.min(limit, 100);
    }

    private Specification<Listing> adminListingSpecification(ListingStatus status, String keyword) {
        return (root, query, criteriaBuilder) -> {
            if (query != null) {
                query.distinct(true);
            }

            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status));
            }

            if (keyword != null) {
                String pattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("city")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("country")), pattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("hostId")), pattern)
                ));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private BigDecimal basePriceOrMax(Listing listing) {
        BigDecimal basePrice = basePrice(listing);
        return basePrice != null ? basePrice : BigDecimal.valueOf(Long.MAX_VALUE);
    }

    private BigDecimal basePriceOrMin(Listing listing) {
        BigDecimal basePrice = basePrice(listing);
        return basePrice != null ? basePrice : BigDecimal.ZERO;
    }

    private BigDecimal basePrice(Listing listing) {
        return listing != null && listing.getPricing() != null
                ? listing.getPricing().getBasePrice()
                : null;
    }

    private LocalDateTime createdAtOrMin(Listing listing) {
        return listing.getCreatedAt() != null ? listing.getCreatedAt() : LocalDateTime.MIN;
    }

    private int maxGuestsOrZero(Listing listing) {
        return listing.getMaxGuests() != null ? listing.getMaxGuests() : 0;
    }

    private int instantBookRank(Listing listing) {
        return Boolean.TRUE.equals(listing.getInstantBook()) ? 0 : 1;
    }

    private int normalizeLimit(Integer limitPerSection) {
        if (limitPerSection == null || limitPerSection < 1) {
            return DEFAULT_SECTION_LIMIT;
        }

        return Math.min(limitPerSection, MAX_SECTION_LIMIT);
    }

    private boolean hasKeycloakUserId(String keycloakUserId) {
        return keycloakUserId != null && !keycloakUserId.isBlank();
    }

    private boolean matchesIgnoreCase(String actual, String expected) {
        return expected == null || expected.isBlank()
                || actual != null && actual.equalsIgnoreCase(expected.trim());
    }

    private List<Listing> filterBySearchCriteria(
            List<Listing> listings,
            String city,
            String country,
            Integer maxGuests,
            BigDecimal minPrice,
            BigDecimal maxPrice) {
        String normalizedCity = normalizeFilter(city);
        String normalizedCountry = normalizeFilter(country);

        return listings.stream()
                .filter(listing -> matchesIgnoreCase(listing.getCity(), normalizedCity))
                .filter(listing -> matchesIgnoreCase(listing.getCountry(), normalizedCountry))
                .filter(listing -> maxGuests == null || listing.getMaxGuests() >= maxGuests)
                .filter(listing -> {
                    if (minPrice == null && maxPrice == null) {
                        return true;
                    }

                    if (listing.getPricing() == null || listing.getPricing().getBasePrice() == null) {
                        return false;
                    }

                    BigDecimal basePrice = listing.getPricing().getBasePrice();
                    boolean matchesMinPrice = minPrice == null || basePrice.compareTo(minPrice) >= 0;
                    boolean matchesMaxPrice = maxPrice == null || basePrice.compareTo(maxPrice) <= 0;
                    return matchesMinPrice && matchesMaxPrice;
                })
                .toList();
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
