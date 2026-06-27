package com.chatbotservice.context;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class InMemoryConversationListingContextStore implements ConversationListingContextStore {
    private static final Duration CONTEXT_TTL = Duration.ofHours(1);
    private static final int MAX_SEARCHES_PER_CONVERSATION = 5;
    private static final int MAX_LISTINGS_PER_SEARCH = 10;

    private final Map<ContextKey, ConversationListingContext> contexts = new ConcurrentHashMap<>();

    @Override
    public void saveSearch(String userId, String conversationId, ListingSearchSnapshot snapshot) {
        if (!isValidKey(userId, conversationId) || snapshot == null || snapshot.listings().isEmpty()) {
            return;
        }

        cleanupExpiredContexts();

        ContextKey key = new ContextKey(userId, conversationId);
        Instant now = Instant.now();
        ListingSearchSnapshot safeSnapshot = trimSnapshot(snapshot);

        contexts.compute(key, (ignored, currentContext) -> {
            List<ListingSearchSnapshot> previousSearches = currentContext != null
                    && currentContext.expiresAt().isAfter(now)
                    ? currentContext.searches()
                    : List.of();

            // Snapshot mới luôn đứng đầu. Khi cùng một listing xuất hiện ở nhiều lần search,
            // backend giữ bản mới nhất nhưng vẫn cho phép resolve trên toàn bộ lịch sử gần đây.
            List<ListingSearchSnapshot> nextSearches = java.util.stream.Stream.concat(
                            java.util.stream.Stream.of(safeSnapshot),
                            previousSearches.stream()
                    )
                    .limit(MAX_SEARCHES_PER_CONVERSATION)
                    .toList();

            return new ConversationListingContext(
                    userId,
                    conversationId,
                    nextSearches,
                    now,
                    now.plus(CONTEXT_TTL)
            );
        });
    }

    @Override
    public ListingResolveResult resolveListing(
            String userId,
            String conversationId,
            String listingTitle
    ) {
        List<ListingSnapshot> listings = allListings(userId, conversationId);
        if (listings.isEmpty()) {
            return ListingResolveResult.noContext();
        }

        if (StringUtils.hasText(listingTitle)) {
            return resolveByTitle(listings, listingTitle);
        }

        if (listings.size() == 1) {
            return ListingResolveResult.found(listings.getFirst());
        }

        return ListingResolveResult.ambiguous(listings);
    }

    @Override
    public Optional<ListingSnapshot> findListingById(String userId, String conversationId, UUID listingId) {
        if (listingId == null) {
            return Optional.empty();
        }

        return validContext(userId, conversationId)
                .stream()
                .flatMap(context -> context.searches().stream())
                .flatMap(search -> search.listings().stream())
                .filter(listing -> listing.listingId().equals(listingId))
                .findFirst();
    }

    private List<ListingSnapshot> allListings(String userId, String conversationId) {
        Optional<ConversationListingContext> context = validContext(userId, conversationId);
        if (context.isEmpty()) {
            return List.of();
        }

        Map<UUID, ListingSnapshot> listingsById = new LinkedHashMap<>();
        context.get().searches().stream()
                .flatMap(search -> search.listings().stream())
                .forEach(listing -> listingsById.putIfAbsent(listing.listingId(), listing));

        return List.copyOf(listingsById.values());
    }

    @Override
    public void clear(String userId, String conversationId) {
        if (isValidKey(userId, conversationId)) {
            contexts.remove(new ContextKey(userId, conversationId));
        }
    }

    private ListingResolveResult resolveByTitle(List<ListingSnapshot> listings, String title) {
        String normalizedTitle = normalizeText(title);
        List<ListingSnapshot> exactMatches = listings.stream()
                .filter(listing -> normalizeText(listing.title()).equals(normalizedTitle))
                .toList();
        if (exactMatches.size() == 1) {
            return ListingResolveResult.found(exactMatches.getFirst());
        }
        if (exactMatches.size() > 1) {
            return ListingResolveResult.ambiguous(exactMatches);
        }

        List<ListingSnapshot> containsMatches = listings.stream()
                .filter(listing -> {
                    String candidate = normalizeText(listing.title());
                    return candidate.contains(normalizedTitle) || normalizedTitle.contains(candidate);
                })
                .toList();

        if (containsMatches.size() == 1) {
            return ListingResolveResult.found(containsMatches.getFirst());
        }
        if (containsMatches.size() > 1) {
            return ListingResolveResult.ambiguous(containsMatches);
        }

        // Nếu LLM không nhớ đúng title nhưng đưa được cụm mô tả như city, loại phòng,
        // giá hoặc sức chứa, backend vẫn thử match trên metadata đã lưu từ listing-service.
        List<String> referenceTokens = meaningfulTokens(normalizedTitle);
        if (!referenceTokens.isEmpty()) {
            List<ListingSnapshot> metadataMatches = listings.stream()
                    .filter(listing -> matchesListingMetadata(listing, referenceTokens))
                    .toList();

            if (metadataMatches.size() == 1) {
                return ListingResolveResult.found(metadataMatches.getFirst());
            }
            if (metadataMatches.size() > 1) {
                return ListingResolveResult.ambiguous(metadataMatches);
            }
        }

        return ListingResolveResult.notFound(listings);
    }

    private boolean matchesListingMetadata(ListingSnapshot listing, List<String> referenceTokens) {
        String searchableText = normalizeText(String.join(
                " ",
                nullToEmpty(listing.title()),
                nullToEmpty(listing.city()),
                nullToEmpty(listing.country()),
                nullToEmpty(listing.roomType()),
                nullToEmpty(listing.propertyType()),
                listing.basePrice() != null ? listing.basePrice().toPlainString() : "",
                nullToEmpty(listing.currency()),
                listing.maxGuests() != null ? listing.maxGuests().toString() : ""
        ));

        return referenceTokens.stream().allMatch(searchableText::contains);
    }

    private List<String> meaningfulTokens(String normalizedText) {
        if (!StringUtils.hasText(normalizedText)) {
            return List.of();
        }

        return java.util.Arrays.stream(normalizedText.split("\\s+"))
                .filter(token -> token.length() >= 2)
                .distinct()
                .toList();
    }

    private String nullToEmpty(Object value) {
        return value != null ? value.toString() : "";
    }

    private Optional<ConversationListingContext> validContext(String userId, String conversationId) {
        if (!isValidKey(userId, conversationId)) {
            return Optional.empty();
        }

        cleanupExpiredContexts();
        ConversationListingContext context = contexts.get(new ContextKey(userId, conversationId));
        if (context == null || !context.expiresAt().isAfter(Instant.now())) {
            return Optional.empty();
        }

        return Optional.of(context);
    }

    private ListingSearchSnapshot trimSnapshot(ListingSearchSnapshot snapshot) {
        List<ListingSnapshot> listings = snapshot.listings()
                .stream()
                .limit(MAX_LISTINGS_PER_SEARCH)
                .toList();

        return new ListingSearchSnapshot(
                snapshot.searchId(),
                snapshot.criteria(),
                listings,
                snapshot.createdAt()
        );
    }

    private void cleanupExpiredContexts() {
        Instant now = Instant.now();
        contexts.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
    }

    private boolean isValidKey(String userId, String conversationId) {
        return StringUtils.hasText(userId) && StringUtils.hasText(conversationId);
    }

    private String normalizeText(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        String withoutAccents = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('\u0111', 'd')
                .replace('\u0110', 'D');

        return withoutAccents
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }

    private record ContextKey(String userId, String conversationId) {
    }
}
