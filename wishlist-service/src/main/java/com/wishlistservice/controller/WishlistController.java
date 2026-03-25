package com.wishlistservice.controller;

import com.wishlistservice.dto.request.CreateWishlistCategoryRequest;
import com.wishlistservice.dto.request.CreateWishlistItemRequest;
import com.wishlistservice.dto.request.MoveWishlistItemRequest;
import com.wishlistservice.dto.request.UpdateWishlistCategoryRequest;
import com.wishlistservice.dto.request.UpdateWishlistItemRequest;
import com.wishlistservice.dto.response.ApiResponse;
import com.wishlistservice.dto.response.WishlistCategoryResponse;
import com.wishlistservice.dto.response.WishlistItemResponse;
import com.wishlistservice.service.IWishlistCategoryService;
import com.wishlistservice.service.IWishlistItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final IWishlistCategoryService categoryService;
    private final IWishlistItemService itemService;

    @PostMapping("/collections")
    public ResponseEntity<ApiResponse<WishlistCategoryResponse>> createCollection(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateWishlistCategoryRequest request) {
        String userId = jwt.getSubject();
        WishlistCategoryResponse result = categoryService.createCategory(userId, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<WishlistCategoryResponse>builder()
                .message("Wishlist collection created successfully")
                .result(result)
                .build());
    }

    @GetMapping("/collections")
    public ResponseEntity<ApiResponse<List<WishlistCategoryResponse>>> getCollections(
            @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        List<WishlistCategoryResponse> result = categoryService.getMyCategories(userId);

        return ResponseEntity.ok(ApiResponse.<List<WishlistCategoryResponse>>builder()
                .message("Wishlist collections retrieved successfully")
                .result(result)
                .build());
    }

    @GetMapping("/collections/{categoryId}")
    public ResponseEntity<ApiResponse<WishlistCategoryResponse>> getCollection(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID categoryId) {
        String userId = jwt.getSubject();
        WishlistCategoryResponse result = categoryService.getCategoryById(userId, categoryId);

        return ResponseEntity.ok(ApiResponse.<WishlistCategoryResponse>builder()
                .message("Wishlist collection retrieved successfully")
                .result(result)
                .build());
    }

    @PutMapping("/collections/{categoryId}")
    public ResponseEntity<ApiResponse<WishlistCategoryResponse>> updateCollection(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID categoryId,
            @Valid @RequestBody UpdateWishlistCategoryRequest request) {
        String userId = jwt.getSubject();
        WishlistCategoryResponse result = categoryService.updateCategory(userId, categoryId, request);

        return ResponseEntity.ok(ApiResponse.<WishlistCategoryResponse>builder()
                .message("Wishlist collection updated successfully")
                .result(result)
                .build());
    }

    @DeleteMapping("/collections/{categoryId}")
    public ResponseEntity<ApiResponse<Void>> deleteCollection(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID categoryId) {
        String userId = jwt.getSubject();
        categoryService.deleteCategory(userId, categoryId);

        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Wishlist collection deleted successfully")
                .build());
    }

    @PostMapping("/collections/{categoryId}/items")
    public ResponseEntity<ApiResponse<WishlistItemResponse>> addItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID categoryId,
            @Valid @RequestBody CreateWishlistItemRequest request) {
        String userId = jwt.getSubject();
        WishlistItemResponse result = itemService.addItem(userId, categoryId, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<WishlistItemResponse>builder()
                .message("Wishlist item added successfully")
                .result(result)
                .build());
    }

    @GetMapping("/collections/{categoryId}/items")
    public ResponseEntity<ApiResponse<List<WishlistItemResponse>>> getItems(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID categoryId) {
        String userId = jwt.getSubject();
        List<WishlistItemResponse> result = itemService.getItemsByCategory(userId, categoryId);

        return ResponseEntity.ok(ApiResponse.<List<WishlistItemResponse>>builder()
                .message("Wishlist items retrieved successfully")
                .result(result)
                .build());
    }

    @GetMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<WishlistItemResponse>> getItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID itemId) {
        String userId = jwt.getSubject();
        WishlistItemResponse result = itemService.getItem(userId, itemId);

        return ResponseEntity.ok(ApiResponse.<WishlistItemResponse>builder()
                .message("Wishlist item retrieved successfully")
                .result(result)
                .build());
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<WishlistItemResponse>> updateItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID itemId,
            @Valid @RequestBody UpdateWishlistItemRequest request) {
        String userId = jwt.getSubject();
        WishlistItemResponse result = itemService.updateItem(userId, itemId, request);

        return ResponseEntity.ok(ApiResponse.<WishlistItemResponse>builder()
                .message("Wishlist item updated successfully")
                .result(result)
                .build());
    }

    @PatchMapping("/items/{itemId}/move")
    public ResponseEntity<ApiResponse<WishlistItemResponse>> moveItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID itemId,
            @Valid @RequestBody MoveWishlistItemRequest request) {
        String userId = jwt.getSubject();
        WishlistItemResponse result = itemService.moveItem(userId, itemId, request);

        return ResponseEntity.ok(ApiResponse.<WishlistItemResponse>builder()
                .message("Wishlist item moved successfully")
                .result(result)
                .build());
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID itemId) {
        String userId = jwt.getSubject();
        itemService.deleteItem(userId, itemId);

        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Wishlist item deleted successfully")
                .build());
    }
}
