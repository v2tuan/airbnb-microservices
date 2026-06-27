package com.chatbotservice.context;

import java.util.List;
import java.util.Optional;

public record ListingResolveResult(
        Status status,
        ListingSnapshot listing,
        List<ListingSnapshot> candidates
) {
    public enum Status {
        FOUND,
        NOT_FOUND,
        AMBIGUOUS,
        NO_CONTEXT
    }

    public static ListingResolveResult found(ListingSnapshot listing) {
        return new ListingResolveResult(Status.FOUND, listing, List.of(listing));
    }

    public static ListingResolveResult notFound(List<ListingSnapshot> candidates) {
        return new ListingResolveResult(Status.NOT_FOUND, null, List.copyOf(candidates));
    }

    public static ListingResolveResult ambiguous(List<ListingSnapshot> candidates) {
        return new ListingResolveResult(Status.AMBIGUOUS, null, List.copyOf(candidates));
    }

    public static ListingResolveResult noContext() {
        return new ListingResolveResult(Status.NO_CONTEXT, null, List.of());
    }

    public Optional<ListingSnapshot> listingOptional() {
        return Optional.ofNullable(listing);
    }
}
