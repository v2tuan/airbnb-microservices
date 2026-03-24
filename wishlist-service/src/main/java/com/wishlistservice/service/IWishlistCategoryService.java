package com.wishlistservice.service;

import com.wishlistservice.dto.request.CreateWishlistCategoryRequest;
import com.wishlistservice.dto.request.UpdateWishlistCategoryRequest;
import com.wishlistservice.dto.response.WishlistCategoryResponse;

import java.util.List;
import java.util.UUID;

public interface IWishlistCategoryService {
  WishlistCategoryResponse createCategory(String userId, CreateWishlistCategoryRequest request);
  List<WishlistCategoryResponse> getMyCategories(String userId);
  WishlistCategoryResponse getCategoryById(String userId, UUID categoryId);
  WishlistCategoryResponse updateCategory(String userId, UUID categoryId, UpdateWishlistCategoryRequest request);
  void deleteCategory(String userId, UUID categoryId);
}
