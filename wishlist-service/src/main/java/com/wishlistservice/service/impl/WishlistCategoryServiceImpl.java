package com.wishlistservice.service.impl;

import com.wishlistservice.exception.AppException;
import com.wishlistservice.exception.ErrorCode;
import com.wishlistservice.dto.request.CreateWishlistCategoryRequest;
import com.wishlistservice.dto.request.UpdateWishlistCategoryRequest;
import com.wishlistservice.dto.response.WishlistCategoryResponse;
import com.wishlistservice.entity.WishlistCategory;
import com.wishlistservice.repository.WishlistCategoryRepository;
import com.wishlistservice.service.IWishlistCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WishlistCategoryServiceImpl implements IWishlistCategoryService {
  private final WishlistCategoryRepository categoryRepository;

  @Override
  public WishlistCategoryResponse createCategory(String userId, CreateWishlistCategoryRequest request) {
    if (categoryRepository.existsByUserIdAndNameIgnoreCase(userId, request.getName())) {
      throw new AppException(ErrorCode.DUPLICATE_COLLECTION_NAME);
    }

    WishlistCategory category = WishlistCategory.builder()
        .userId(userId)
        .name(request.getName().trim())
        .description(request.getDescription())
        .build();

    category = categoryRepository.save(category);
    return toResponse(category, 0L);
  }

  @Override
  public List<WishlistCategoryResponse> getMyCategories(String userId) {
    return categoryRepository.findByUserIdOrderByCreatedAtDesc(userId)
        .stream()
        .map(c -> toResponse(c, (long) c.getItems().size()))
        .toList();
  }

  @Override
  public WishlistCategoryResponse getCategoryById(String userId, UUID categoryId) {
    WishlistCategory category = categoryRepository.findByCategoryIdAndUserId(categoryId, userId)
        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
    return toResponse(category, (long) category.getItems().size());
  }

  @Override
  public WishlistCategoryResponse updateCategory(String userId, UUID categoryId, UpdateWishlistCategoryRequest request) {
    WishlistCategory category = categoryRepository.findByCategoryIdAndUserId(categoryId, userId)
        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

    if (!category.getName().equalsIgnoreCase(request.getName())
        && categoryRepository.existsByUserIdAndNameIgnoreCase(userId, request.getName())) {
      throw new AppException(ErrorCode.DUPLICATE_COLLECTION_NAME);
    }

    category.setName(request.getName().trim());
    category.setDescription(request.getDescription());

    category = categoryRepository.save(category);
    return toResponse(category, (long) category.getItems().size());
  }

  @Override
  public void deleteCategory(String userId, UUID categoryId) {
    WishlistCategory category = categoryRepository.findByCategoryIdAndUserId(categoryId, userId)
        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
    categoryRepository.delete(category);
  }

  private WishlistCategoryResponse toResponse(WishlistCategory category, Long itemCount) {
    return WishlistCategoryResponse.builder()
        .categoryId(category.getCategoryId())
        .name(category.getName())
        .description(category.getDescription())
        .isDefault(category.getIsDefault())
        .itemCount(itemCount)
        .createdAt(category.getCreatedAt())
        .build();
  }
}
