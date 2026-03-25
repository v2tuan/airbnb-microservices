package com.wishlistservice.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(
    name = "wishlist_items",
    uniqueConstraints = @UniqueConstraint(name = "uq_wishlist_item_category_listing", columnNames = {"category_id", "listing_id"}),
    indexes = {
        @Index(name = "idx_wishlist_items_category", columnList = "category_id"),
        @Index(name = "idx_wishlist_items_listing", columnList = "listing_id")
    }
)
public class WishlistItem extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name = "item_id")
  UUID itemId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "category_id", nullable = false)
  WishlistCategory category;

  @Column(name = "listing_id", nullable = false)
  UUID listingId;

  @Column(name = "note", length = 255)
  String note;
}