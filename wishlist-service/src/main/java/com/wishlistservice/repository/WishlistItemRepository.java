package com.wishlistservice.repository;

import com.wishlistservice.entity.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WishlistItemRepository extends JpaRepository<WishlistItem, UUID> {
  List<WishlistItem> findByCategoryCategoryIdOrderByCreatedAtDesc(UUID categoryId);
  Optional<WishlistItem> findByItemIdAndCategoryUserId(UUID itemId, String userId);
  boolean existsByCategoryCategoryIdAndListingId(UUID categoryId, UUID listingId);
}