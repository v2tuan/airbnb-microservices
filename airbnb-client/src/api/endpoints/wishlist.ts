import type { AxiosResponse } from "axios";
import apiClient from "../client";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

export interface ApiResponse<T> {
  code?: number;
  message?: string;
  result: T;
}

export interface WishlistCategoryResponse {
  categoryId: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  itemCount: number;
  createdAt: string;
}

export interface WishlistItemResponse {
  itemId: string;
  categoryId: string;
  listingId: string;
  note?: string | null;
  createdAt: string;
}

export interface CreateWishlistCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateWishlistCategoryRequest {
  name: string;
  description?: string;
}

export interface CreateWishlistItemRequest {
  listingId: string;
  note?: string;
}

export interface UpdateWishlistItemRequest {
  note?: string;
}

export interface MoveWishlistItemRequest {
  targetCategoryId: string;
}

const withAuth = (token: string) => ({
  headers: { Authorization: "Bearer " + token },
});

export const wishlistAPI = {
  createCollection: (
    token: string,
    payload: CreateWishlistCategoryRequest
  ): Promise<AxiosResponse<ApiResponse<WishlistCategoryResponse>>> => {
    return apiClient.post(
      prefix + "/wishlist/collections",
      payload,
      withAuth(token)
    );
  },

  getCollections: (
    token: string
  ): Promise<AxiosResponse<ApiResponse<WishlistCategoryResponse[]>>> => {
    return apiClient.get(prefix + "/wishlist/collections", withAuth(token));
  },

  getCollection: (
    token: string,
    categoryId: string
  ): Promise<AxiosResponse<ApiResponse<WishlistCategoryResponse>>> => {
    return apiClient.get(
      prefix + "/wishlist/collections/" + categoryId,
      withAuth(token)
    );
  },

  updateCollection: (
    token: string,
    categoryId: string,
    payload: UpdateWishlistCategoryRequest
  ): Promise<AxiosResponse<ApiResponse<WishlistCategoryResponse>>> => {
    return apiClient.put(
      prefix + "/wishlist/collections/" + categoryId,
      payload,
      withAuth(token)
    );
  },

  deleteCollection: (
    token: string,
    categoryId: string
  ): Promise<AxiosResponse<ApiResponse<null>>> => {
    return apiClient.delete(
      prefix + "/wishlist/collections/" + categoryId,
      withAuth(token)
    );
  },

  addItem: (
    token: string,
    categoryId: string,
    payload: CreateWishlistItemRequest
  ): Promise<AxiosResponse<ApiResponse<WishlistItemResponse>>> => {
    return apiClient.post(
      prefix + "/wishlist/collections/" + categoryId + "/items",
      payload,
      withAuth(token)
    );
  },

  getItems: (
    token: string,
    categoryId: string
  ): Promise<AxiosResponse<ApiResponse<WishlistItemResponse[]>>> => {
    return apiClient.get(
      prefix + "/wishlist/collections/" + categoryId + "/items",
      withAuth(token)
    );
  },

  getItem: (
    token: string,
    itemId: string
  ): Promise<AxiosResponse<ApiResponse<WishlistItemResponse>>> => {
    return apiClient.get(prefix + "/wishlist/items/" + itemId, withAuth(token));
  },

  updateItem: (
    token: string,
    itemId: string,
    payload: UpdateWishlistItemRequest
  ): Promise<AxiosResponse<ApiResponse<WishlistItemResponse>>> => {
    return apiClient.put(
      prefix + "/wishlist/items/" + itemId,
      payload,
      withAuth(token)
    );
  },

  moveItem: (
    token: string,
    itemId: string,
    payload: MoveWishlistItemRequest
  ): Promise<AxiosResponse<ApiResponse<WishlistItemResponse>>> => {
    return apiClient.patch(
      prefix + "/wishlist/items/" + itemId + "/move",
      payload,
      withAuth(token)
    );
  },

  deleteItem: (
    token: string,
    itemId: string
  ): Promise<AxiosResponse<ApiResponse<null>>> => {
    return apiClient.delete(prefix + "/wishlist/items/" + itemId, withAuth(token));
  },
};

export default wishlistAPI;