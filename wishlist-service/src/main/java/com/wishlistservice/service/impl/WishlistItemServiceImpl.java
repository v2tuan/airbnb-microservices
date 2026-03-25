package com.wishlistservice.service.impl;

import com.wishlistservice.exception.AppException;
import com.wishlistservice.exception.ErrorCode;
import com.wishlistservice.dto.request.CreateWishlistItemRequest;
import com.wishlistservice.dto.request.MoveWishlistItemRequest;
import com.wishlistservice.dto.request.UpdateWishlistItemRequest;
import com.wishlistservice.dto.response.WishlistItemResponse;
import com.wishlistservice.entity.WishlistCategory;
import com.wishlistservice.entity.WishlistItem;
import com.wishlistservice.repository.WishlistCategoryRepository;
import com.wishlistservice.repository.WishlistItemRepository;
import com.wishlistservice.service.IWishlistItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WishlistItemServiceImpl implements IWishlistItemService {

  private final WishlistItemRepository itemRepository;
  private final WishlistCategoryRepository categoryRepository;

  @Override
  public WishlistItemResponse addItem(String userId, UUID categoryId, CreateWishlistItemRequest request) {
    WishlistCategory category = categoryRepository.findByCategoryIdAndUserId(categoryId, userId)
        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

    if (itemRepository.existsByCategoryCategoryIdAndListingId(categoryId, request.getListingId())) {
      throw new AppException(ErrorCode.ITEM_ALREADY_EXISTS_IN_COLLECTION);
    }

    WishlistItem item = WishlistItem.builder()
        .category(category)
        .listingId(request.getListingId())
        .note(request.getNote())
        .build();

    item = itemRepository.save(item);
    return toResponse(item);
  }

  @Override
  public List<WishlistItemResponse> getItemsByCategory(String userId, UUID categoryId) {
    categoryRepository.findByCategoryIdAndUserId(categoryId, userId)
        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

    return itemRepository.findByCategoryCategoryIdOrderByCreatedAtDesc(categoryId)
        .stream()
        .map(this::toResponse)
        .toList();
  }

  @Override
  public WishlistItemResponse getItem(String userId, UUID itemId) {
    WishlistItem item = itemRepository.findByItemIdAndCategoryUserId(itemId, userId)
        .orElseThrow(() -> new AppException(ErrorCode.ITEM_NOT_FOUND));
    return toResponse(item);
  }

  @Override
  public WishlistItemResponse updateItem(String userId, UUID itemId, UpdateWishlistItemRequest request) {
    WishlistItem item = itemRepository.findByItemIdAndCategoryUserId(itemId, userId)
        .orElseThrow(() -> new AppException(ErrorCode.ITEM_NOT_FOUND));

    item.setNote(request.getNote());
    item = itemRepository.save(item);
    return toResponse(item);
  }

  @Override
  public WishlistItemResponse moveItem(String userId, UUID itemId, MoveWishlistItemRequest request) {
    WishlistItem item = itemRepository.findByItemIdAndCategoryUserId(itemId, userId)
        .orElseThrow(() -> new AppException(ErrorCode.ITEM_NOT_FOUND));

    WishlistCategory target = categoryRepository.findByCategoryIdAndUserId(request.getTargetCategoryId(), userId)
        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));

    if (itemRepository.existsByCategoryCategoryIdAndListingId(target.getCategoryId(), item.getListingId())) {
      throw new AppException(ErrorCode.ITEM_ALREADY_EXISTS_IN_COLLECTION);
    }

    item.setCategory(target);
    item = itemRepository.save(item);
    return toResponse(item);
  }

  @Override
  public void deleteItem(String userId, UUID itemId) {
    WishlistItem item = itemRepository.findByItemIdAndCategoryUserId(itemId, userId)
        .orElseThrow(() -> new AppException(ErrorCode.ITEM_NOT_FOUND));
    itemRepository.delete(item);
  }

  private WishlistItemResponse toResponse(WishlistItem item) {
    return WishlistItemResponse.builder()
        .itemId(item.getItemId())
        .categoryId(item.getCategory().getCategoryId())
        .listingId(item.getListingId())
        .note(item.getNote())
        .createdAt(item.getCreatedAt())
        .build();
  }
}
