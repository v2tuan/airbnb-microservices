package com.wishlistservice.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(
    name = "wishlist_categories",
    uniqueConstraints = @UniqueConstraint(name = "uq_wishlist_category_user_name", columnNames = {"user_id", "name"}),
    indexes = {
        @Index(name = "idx_wishlist_categories_user", columnList = "user_id")
    }
)
public class WishlistCategory extends BaseEntity{
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(name="category_id")
  UUID categoryId;

  @Column(name="user_id", nullable = false, length=100)
  String userId;

  @Column(name="name", nullable = false, length= 100)
  String name;

  @Column(name = "description", length = 255)
  String description;

  @Column(name = "is_default", nullable = false)
  @Builder.Default
  Boolean isDefault = false;

  @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  Set<WishlistItem> items = new HashSet<>();
}
