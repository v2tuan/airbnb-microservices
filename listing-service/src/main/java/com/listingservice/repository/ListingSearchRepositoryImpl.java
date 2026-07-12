package com.listingservice.repository;

import com.listingservice.constant.ListingStatus;
import com.listingservice.entity.Listing;
import com.listingservice.search.ListingSearchCriteria;
import com.listingservice.search.ListingSearchSort;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RequiredArgsConstructor
class ListingSearchRepositoryImpl implements ListingSearchRepository {
    private static final BigDecimal PRICE_ASC_NULL_SENTINEL = BigDecimal.valueOf(Long.MAX_VALUE);
    private static final BigDecimal PRICE_DESC_NULL_SENTINEL = BigDecimal.ZERO;

    private final EntityManager entityManager;

    @Override
    public List<UUID> findCandidateIds(ListingSearchCriteria criteria) {
        CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
        var query = criteriaBuilder.createQuery(UUID.class);
        Root<Listing> listing = query.from(Listing.class);
        Join<Listing, Object> pricing = null;

        List<Predicate> predicates = new ArrayList<>();
        predicates.add(criteriaBuilder.equal(listing.get("status"), ListingStatus.ACTIVE));

        addTextSearchPredicate(predicates, criteriaBuilder, listing, criteria.keyword());
        addEqualIgnoreCasePredicate(predicates, criteriaBuilder, listing.get("state"), criteria.state());
        addEqualIgnoreCasePredicate(predicates, criteriaBuilder, listing.get("country"), criteria.country());

        if (criteria.guests() != null) {
            predicates.add(criteriaBuilder.greaterThanOrEqualTo(listing.get("maxGuests"), criteria.guests()));
        }

        if (criteria.minBedrooms() != null) {
            predicates.add(criteriaBuilder.greaterThanOrEqualTo(listing.get("numBedrooms"), criteria.minBedrooms()));
        }

        if (criteria.minBeds() != null) {
            predicates.add(criteriaBuilder.greaterThanOrEqualTo(listing.get("numBeds"), criteria.minBeds()));
        }

        if (criteria.minBathrooms() != null) {
            predicates.add(criteriaBuilder.greaterThanOrEqualTo(listing.get("numBathrooms"), criteria.minBathrooms()));
        }

        if (!criteria.propertyTypes().isEmpty()) {
            predicates.add(listing.get("propertyType").in(criteria.propertyTypes()));
        }

        if (!criteria.roomTypes().isEmpty()) {
            predicates.add(listing.get("roomType").in(criteria.roomTypes()));
        }

        if (criteria.instantBook() != null) {
            predicates.add(criteriaBuilder.equal(listing.get("instantBook"), criteria.instantBook()));
        }

        if (criteria.hasPriceFilter()) {
            pricing = listing.join("pricing", JoinType.INNER);

            if (criteria.minPrice() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(pricing.get("basePrice"), criteria.minPrice()));
            }

            if (criteria.maxPrice() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(pricing.get("basePrice"), criteria.maxPrice()));
            }
        }

        if (criteria.sortsByPrice() && pricing == null) {
            pricing = listing.join("pricing", JoinType.LEFT);
        }

        query.select(listing.get("listingId"))
                .where(criteriaBuilder.and(predicates.toArray(Predicate[]::new)))
                .orderBy(orderBy(criteriaBuilder, listing, pricing, criteria.sort()));

        TypedQuery<UUID> typedQuery = entityManager.createQuery(query);
        typedQuery.setMaxResults(criteria.limit());
        return typedQuery.getResultList();
    }

    private void addTextSearchPredicate(
            List<Predicate> predicates,
            CriteriaBuilder criteriaBuilder,
            Root<Listing> listing,
            String keyword
    ) {
        if (keyword == null) {
            return;
        }

        String pattern = "%" + compactText(keyword) + "%";
        predicates.add(criteriaBuilder.or(
            containsIgnoreCase(criteriaBuilder, listing.get("title"), pattern),
            containsIgnoreCase(criteriaBuilder, listing.get("description"), pattern),
            containsIgnoreCase(criteriaBuilder, listing.get("address"), pattern),
            containsIgnoreCase(criteriaBuilder, listing.get("city"), pattern),
            containsIgnoreCase(criteriaBuilder, listing.get("state"), pattern),
            containsIgnoreCase(criteriaBuilder, listing.get("country"), pattern)
        ));
    }

    private Predicate containsIgnoreCase(CriteriaBuilder criteriaBuilder, Path<String> path, String pattern) {
        return criteriaBuilder.like(compactExpression(criteriaBuilder, path), pattern);
    }

    private void addEqualIgnoreCasePredicate(
            List<Predicate> predicates,
            CriteriaBuilder criteriaBuilder,
            Path<String> path,
            String value
    ) {
        if (value != null) {
            predicates.add(criteriaBuilder.equal(
                    compactExpression(criteriaBuilder, path),
                    compactText(value)
            ));
        }
    }

    private Expression<String> compactExpression(CriteriaBuilder criteriaBuilder, Path<String> path) {
        return criteriaBuilder.function(
                "replace",
                String.class,
            criteriaBuilder.function(
                "translate",
                String.class,
                criteriaBuilder.lower(path),
                criteriaBuilder.literal(ACCENTED_CHARS),
                criteriaBuilder.literal(PLAIN_CHARS)
            ),
                criteriaBuilder.literal(" "),
                criteriaBuilder.literal("")
        );
    }

    private String compactText(String value) {
        if (value == null) {
            return null;
        }

        String normalized = Normalizer.normalize(value.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "");
        return normalized.replaceAll("\\s+", "");
    }

        private static final String ACCENTED_CHARS =
            "áàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ";

        private static final String PLAIN_CHARS =
            "aaaaaaaaaaaaaaaaaadeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyy";

    private List<Order> orderBy(
            CriteriaBuilder criteriaBuilder,
            Root<Listing> listing,
            Join<Listing, Object> pricing,
            ListingSearchSort sort
    ) {
        return switch (sort) {
            case PRICE_ASC -> List.of(criteriaBuilder.asc(priceOr(criteriaBuilder, pricing, PRICE_ASC_NULL_SENTINEL)));
            case PRICE_DESC -> List.of(criteriaBuilder.desc(priceOr(criteriaBuilder, pricing, PRICE_DESC_NULL_SENTINEL)));
            case CREATED_ASC -> List.of(criteriaBuilder.asc(listing.get("createdAt")));
            case CREATED_DESC -> List.of(criteriaBuilder.desc(listing.get("createdAt")));
            case GUESTS_DESC -> List.of(
                    criteriaBuilder.desc(listing.get("maxGuests")),
                    criteriaBuilder.desc(listing.get("createdAt"))
            );
            case RELEVANCE -> List.of(
                    criteriaBuilder.asc(instantBookRank(criteriaBuilder, listing)),
                    criteriaBuilder.desc(listing.get("createdAt"))
            );
        };
    }

    private Expression<BigDecimal> priceOr(
            CriteriaBuilder criteriaBuilder,
            Join<Listing, Object> pricing,
            BigDecimal fallback
    ) {
        CriteriaBuilder.Coalesce<BigDecimal> coalesce = criteriaBuilder.coalesce();
        coalesce.value(pricing.get("basePrice"));
        coalesce.value(fallback);
        return coalesce;
    }

    private Expression<Integer> instantBookRank(CriteriaBuilder criteriaBuilder, Root<Listing> listing) {
        return criteriaBuilder.<Integer>selectCase()
                .when(criteriaBuilder.isTrue(listing.get("instantBook")), 0)
                .otherwise(1);
    }
}
