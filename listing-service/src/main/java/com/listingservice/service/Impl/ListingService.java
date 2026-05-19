package com.listingservice.service.Impl;

import com.listingservice.constant.ListingStatus;
import com.listingservice.dto.request.ListingCreationRequest;
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
import com.listingservice.service.IListingService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
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

    @Override
    @Transactional
    public ListingResponse createListing(ListingCreationRequest request, String keycloakUserId) {
        log.info("Creating listing with title: {} for host: {}", request.getTitle(), keycloakUserId);

        Listing listing = listingMapper.toEntity(request);
        listing.setHostId(keycloakUserId);  // Set Keycloak user ID as hostId
        listing.setStatus(ListingStatus.DRAFT);

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
    public List<ListingResponse> searchListings(String city, String country, Integer maxGuests) {
        log.info("Searching listings - City: {}, Country: {}, Max Guests: {}", city, country, maxGuests);

        List<Listing> listings;

        if (city != null && country != null) {
            listings = listingRepository.findByCityAndCountry(city, country);
        } else if (city != null) {
            listings = listingRepository.findByCity(city);
        } else {
            listings = listingRepository.findByStatus(ListingStatus.ACTIVE);
        }

        if (maxGuests != null) {
            listings = listings.stream()
                    .filter(l -> l.getMaxGuests() >= maxGuests)
                    .toList();
        }

        return listings.stream()
                .map(listingMapper::toResponse)
                .toList();
    }

    @Override
    public List<ListingResponse> searchByPriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        log.info("Searching listings by price range: {} - {}", minPrice, maxPrice);

        return listingRepository.findByPriceRangeAndStatus(minPrice, maxPrice, ListingStatus.ACTIVE)
                .stream()
                .map(listingMapper::toResponse)
                .toList();
    }

    @Override
    public List<ListingResponse> searchByLocation(BigDecimal latitude, BigDecimal longitude, Double radius) {
        log.info("Searching listings by location - Lat: {}, Lng: {}, Radius: {}km", latitude, longitude, radius);

        return listingRepository.findByLocationWithinRadius(latitude, longitude, radius, ListingStatus.ACTIVE)
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

        listing.setStatus(ListingStatus.INACTIVE);
        listingRepository.save(listing);

        log.info("Listing deactivated: {}", listingId);
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

        return listingsPage.map(this::toListingItemResponse);
    }

    private HomeSectionResponse buildSection(String sectionKey, String title, String city, int limit) {
        List<HomeListingCardResponse> listings = listingRepository
                .findByCityIgnoreCaseAndStatus(city, ListingStatus.ACTIVE)
                .stream()
                .sorted(Comparator.comparing(Listing::getInstantBook, Comparator.nullsLast(Boolean::compareTo)).reversed())
                .limit(limit)
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
        return ListingItemResponse.builder()
                .id(listing.getListingId().toString())
                .title(listing.getTitle())
                .thumbnailUrl(resolveCoverImageUrl(listing))
                .city(listing.getCity())
                .shortFeatures(buildShortFeatures(listing))
                .avgRating(resolveBasicRating(listing).doubleValue())
                .reviewCount(0L) // TODO: Fetch từ rating-service khi cần
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
}

