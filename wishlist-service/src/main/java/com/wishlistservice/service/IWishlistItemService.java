package com.wishlistservice.service;

import com.wishlistservice.dto.request.CreateWishlistItemRequest;
import com.wishlistservice.dto.request.MoveWishlistItemRequest;
import com.wishlistservice.dto.request.UpdateWishlistItemRequest;
import com.wishlistservice.dto.response.WishlistItemResponse;

import java.util.List;
import java.util.UUID;

public interface IWishlistItemService {
  WishlistItemResponse addItem(String userId, UUID categoryId, CreateWishlistItemRequest request);
  List<WishlistItemResponse> getItemsByCategory(String userId, UUID categoryId);
  WishlistItemResponse getItem(String userId, UUID itemId);
  WishlistItemResponse updateItem(String userId, UUID itemId, UpdateWishlistItemRequest request);
  WishlistItemResponse moveItem(String userId, UUID itemId, MoveWishlistItemRequest request);
  void deleteItem(String userId, UUID itemId);
}