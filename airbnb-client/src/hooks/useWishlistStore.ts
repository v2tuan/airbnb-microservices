import { create } from "zustand";
import wishlistAPI from "@/api/endpoints/wishlist";
import type {
  CreateWishlistCategoryRequest,
  WishlistCategoryResponse,
  WishlistItemResponse,
} from "@/api/endpoints/wishlist";

interface ListingWishlistEntry {
  itemId: string;
  categoryId: string;
}

type WishlistItemsByCategory = Record<string, WishlistItemResponse[]>;
type WishlistMapByListingId = Record<string, ListingWishlistEntry>;

const DEFAULT_COLLECTION_PAYLOAD: CreateWishlistCategoryRequest = {
  name: "Favorites",
  description: "My saved places",
};

const toErrorMessage = (error: unknown) => {
  const message =
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? (error as { message?: string })?.message;
  return message ?? "Wishlist request failed";
};

const buildListingMap = (items: WishlistItemsByCategory): WishlistMapByListingId => {
  const listingMap: WishlistMapByListingId = {};

  Object.entries(items).forEach(([categoryId, categoryItems]) => {
    categoryItems.forEach((item) => {
      listingMap[item.listingId] = {
        itemId: item.itemId,
        categoryId,
      };
    });
  });

  return listingMap;
};

const findTargetCollection = (collections: WishlistCategoryResponse[]) => {
  return collections.find((collection) => collection.isDefault) ?? collections[0] ?? null;
};

interface WishlistState {
  collections: WishlistCategoryResponse[];
  items: WishlistItemsByCategory;
  listingMap: WishlistMapByListingId;
  pendingByListingId: Record<string, boolean>;

  loading: boolean;
  error: string | null;

  fetchCollections: (token: string) => Promise<void>;
  createCollection: (
    token: string,
    payload: CreateWishlistCategoryRequest
  ) => Promise<WishlistCategoryResponse | null>;
  deleteCollection: (token: string, categoryId: string) => Promise<void>;

  fetchItems: (token: string, categoryId: string) => Promise<void>;
  addItem: (
    token: string,
    categoryId: string,
    payload: { listingId: string; note?: string }
  ) => Promise<void>;
  deleteItem: (token: string, itemId: string) => Promise<void>;

  hydrateWishlist: (token: string) => Promise<void>;
  toggleListing: (token: string, listingId: string) => Promise<boolean>;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  collections: [],
  items: {},
  listingMap: {},
  pendingByListingId: {},

  loading: false,
  error: null,

  fetchCollections: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await wishlistAPI.getCollections(token);
      set({ collections: res.data.result });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    } finally {
      set({ loading: false });
    }
  },

  createCollection: async (token, payload) => {
    try {
      const res = await wishlistAPI.createCollection(token, payload);
      const created = res.data.result;
      set({
        collections: [created, ...get().collections],
      });
      return created;
    } catch (error) {
      set({ error: toErrorMessage(error) });
      return null;
    }
  },

  deleteCollection: async (token, categoryId) => {
    try {
      await wishlistAPI.deleteCollection(token, categoryId);
      const nextItems = { ...get().items };
      delete nextItems[categoryId];

      set({
        collections: get().collections.filter(
          (c) => c.categoryId !== categoryId
        ),
        items: nextItems,
        listingMap: buildListingMap(nextItems),
      });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  },

  fetchItems: async (token, categoryId) => {
    set({ loading: true });
    try {
      const res = await wishlistAPI.getItems(token, categoryId);
      const nextItems = {
        ...get().items,
        [categoryId]: res.data.result,
      };

      set({
        items: nextItems,
        listingMap: buildListingMap(nextItems),
      });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (token, categoryId, payload) => {
    try {
      const res = await wishlistAPI.addItem(token, categoryId, payload);

      const currentItems = get().items[categoryId] || [];
      const nextItems = {
        ...get().items,
        [categoryId]: [...currentItems, res.data.result],
      };

      set({
        items: nextItems,
        listingMap: buildListingMap(nextItems),
      });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  },

  deleteItem: async (token, itemId) => {
    try {
      await wishlistAPI.deleteItem(token, itemId);

      const nextItems: WishlistItemsByCategory = Object.fromEntries(
        Object.entries(get().items).map(([categoryId, categoryItems]) => [
          categoryId,
          categoryItems.filter((item) => item.itemId !== itemId),
        ])
      );

      set({
        items: nextItems,
        listingMap: buildListingMap(nextItems),
      });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  },

  hydrateWishlist: async (token) => {
    set({ loading: true, error: null });

    try {
      const collectionsRes = await wishlistAPI.getCollections(token);
      const collections = collectionsRes.data.result;

      const itemResults = await Promise.all(
        collections.map(async (collection) => {
          const itemsRes = await wishlistAPI.getItems(token, collection.categoryId);
          return [collection.categoryId, itemsRes.data.result] as const;
        })
      );

      const nextItems: WishlistItemsByCategory = Object.fromEntries(itemResults);

      set({
        collections,
        items: nextItems,
        listingMap: buildListingMap(nextItems),
      });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    } finally {
      set({ loading: false });
    }
  },

  toggleListing: async (token, listingId) => {
    set({
      pendingByListingId: {
        ...get().pendingByListingId,
        [listingId]: true,
      },
      error: null,
    });

    try {
      const existing = get().listingMap[listingId];
      if (existing) {
        await get().deleteItem(token, existing.itemId);
        return false;
      }

      let targetCollection = findTargetCollection(get().collections);
      if (!targetCollection) {
        const created = await get().createCollection(token, DEFAULT_COLLECTION_PAYLOAD);
        if (!created) {
          throw new Error("Cannot create wishlist collection");
        }
        targetCollection = created;
      }

      await get().addItem(token, targetCollection.categoryId, { listingId });
      return true;
    } catch (error) {
      set({ error: toErrorMessage(error) });
      return !!get().listingMap[listingId];
    } finally {
      set({
        pendingByListingId: {
          ...get().pendingByListingId,
          [listingId]: false,
        },
      });
    }
  },
}));