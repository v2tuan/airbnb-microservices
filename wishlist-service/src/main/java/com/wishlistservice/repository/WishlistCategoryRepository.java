package com.wishlistservice.repository;

import com.wishlistservice.entity.WishlistCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WishlistCategoryRepository extends JpaRepository<WishlistCategory, UUID> {
  List<WishlistCategory> findByUserIdOrderByCreatedAtDesc(String userId);
  Optional<WishlistCategory> findByCategoryIdAndUserId(UUID categoryId, String userId);
  boolean existsByUserIdAndNameIgnoreCase(String userId, String name);
}
