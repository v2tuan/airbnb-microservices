"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";
import { ChevronRight } from "lucide-react";
import { listingAPI, unwrapApiData } from "@/api/endpoints/listing";
import { useWishlistStore } from "@/hooks/useWishlistStore";
import type { RootState } from "@/store";
import { selectIsAuthenticated } from "@/features/auth/authSelectors";

interface CollectionPreviewImage {
  listingId: string;
  title: string;
  coverImageUrl: string;
}

interface CollectionWithPreview {
  categoryId: string;
  name: string;
  itemCount: number;
  previews: CollectionPreviewImage[];
}

const placeholderImage =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop";

export default function WishlistsPage() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);

  const { hydrateWishlist, collections, items, loading, error } = useWishlistStore();
  const [previewMap, setPreviewMap] = useState<Record<string, CollectionPreviewImage[]>>({});
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!isAuthenticated || !token) {
        setPageLoading(false);
        return;
      }

      setPageLoading(true);
      await hydrateWishlist(token);
      setPageLoading(false);
    };

    void run();
  }, [hydrateWishlist, isAuthenticated, token]);

  useEffect(() => {
    const loadPreviews = async () => {
      if (!collections.length) {
        setPreviewMap({});
        return;
      }

      const nextPreviewMap: Record<string, CollectionPreviewImage[]> = {};

      await Promise.all(
        collections.map(async (collection) => {
          const categoryItems = items[collection.categoryId] || [];
          const topFour = categoryItems.slice(0, 4);

          const previews = await Promise.all(
            topFour.map(async (item) => {
              try {
                const res = await listingAPI.getRoomById(item.listingId);
                const listing = unwrapApiData(res.data);

                const imageFromRoom =
                  listing?.photos?.find((photo) => photo.isCover)?.photoUrl ||
                  listing?.photos?.[0]?.photoUrl ||
                  placeholderImage;

                return {
                  listingId: item.listingId,
                  title: listing?.title || "Listing",
                  coverImageUrl: imageFromRoom,
                };
              } catch {
                return {
                  listingId: item.listingId,
                  title: "Listing",
                  coverImageUrl: placeholderImage,
                };
              }
            })
          );

          nextPreviewMap[collection.categoryId] = previews;
        })
      );

      setPreviewMap(nextPreviewMap);
    };

    void loadPreviews();
  }, [collections, items]);

  const collectionsWithPreview: CollectionWithPreview[] = useMemo(() => {
    return collections.map((c) => {
      const countFromItems = (items[c.categoryId] || []).length;
      return {
        categoryId: c.categoryId,
        name: c.name,
        itemCount: countFromItems || c.itemCount || 0,
        previews: previewMap[c.categoryId] || [],
      };
    });
  }, [collections, items, previewMap]);

  if (!isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-8">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">Wishlists</h1>
        <p className="mt-4 text-neutral-600">Please log in to view your collection.</p>
      </main>
    );
  }

  if (pageLoading || loading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-8">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">Wishlists</h1>
        <p className="mt-4 text-neutral-600">Loading collections...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-8">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">Wishlists</h1>
        <p className="mt-4 text-red-500">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-8">
      <h1 className="text-5xl font-semibold tracking-tight text-neutral-900">Wishlists</h1>

      {collectionsWithPreview.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-neutral-200 bg-white p-8">
          <p className="text-neutral-700">You dont't have any collections.</p>
        </div>
      ) : (
        <section className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {collectionsWithPreview.map((collection) => (
            <Link
              key={collection.categoryId}
              href={"/wishlists/" + collection.categoryId}
              className="group block"
            >
              <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md">
                <div className="grid grid-cols-2 grid-rows-2 gap-1 bg-neutral-100 p-1">
                  {[0, 1, 2, 3].map((idx) => {
                    const preview = collection.previews[idx];
                    return (
                      <div
                        key={idx}
                        className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-200"
                      >
                        <Image
                          src={preview?.coverImageUrl || placeholderImage}
                          alt={preview?.title || collection.name}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 24vw"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-start justify-between px-3 pb-4 pt-3">
                  <div>
                    <p className="text-2xl font-semibold text-neutral-900">{collection.name}</p>
                    <p className="text-sm text-neutral-500">{collection.itemCount} saved</p>
                  </div>
                  <ChevronRight className="mt-1 size-5 text-neutral-500 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
