"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listingAPI, type HomeListingCardResponse, unwrapApiData } from "@/api/endpoints/listing";
import ListingCard from "@/components/cards/ListingCard";
import { useWishlistStore } from "@/hooks/useWishlistStore";
import type { RootState } from "@/store";

interface RoomResult {
  listingId?: string;
  title?: string;
  city?: string;
  country?: string;
  coverImageUrl?: string;
  basePrice?: number;
  currency?: string;
  rating?: number;
  pricing?: {
    basePrice?: number;
    currency?: string;
  };
  photos?: Array<{ url?: string; photoUrl?: string } | string>;
}

const mapRoomToCard = (room: RoomResult): HomeListingCardResponse | null => {
  if (!room?.listingId) return null;

  let cover = room.coverImageUrl || "";
  if (!cover && Array.isArray(room.photos) && room.photos.length > 0) {
    const first = room.photos[0];
    cover = typeof first === "string" ? first : first?.url || first?.photoUrl || "";
  }

  return {
    listingId: room.listingId,
    title: room.title || "Listing",
    city: room.city || "Unknown",
    country: room.country || "Unknown",
    coverImageUrl: cover || "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop",
    basePrice: room.basePrice || room.pricing?.basePrice || 0,
    currency: room.currency || room.pricing?.currency || "USD",
    rating: room.rating || 0,
    maxGuests: 2,
  };
};

export default function WishlistCollectionDetailPage() {
  const params = useParams();
  const routeId = params?.id;
  const categoryId = Array.isArray(routeId) ? routeId[0] ?? "" : routeId ?? "";

  const token = useSelector((state: RootState) => state.auth.token);

  const {
    collections,
    items,
    fetchCollections,
    fetchItems,
    toggleListing,
    pendingByListingId,
    listingMap,
  } = useWishlistStore();

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<HomeListingCardResponse[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!token || !categoryId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await fetchCollections(token);
      await fetchItems(token, categoryId);

      const categoryItems = (useWishlistStore.getState().items[categoryId] || []).slice();

      const listingCards = (
        await Promise.all(
          categoryItems.map(async (item) => {
            try {
              const res = await listingAPI.getRoomById(item.listingId);
              return mapRoomToCard(unwrapApiData(res.data));
            } catch {
              return null;
            }
          })
        )
      ).filter(Boolean) as HomeListingCardResponse[];

      setCards(listingCards);
      setLoading(false);
    };

    void run();
  }, [token, categoryId, fetchCollections, fetchItems]);

  const collection = useMemo(
    () => collections.find((c) => c.categoryId === categoryId),
    [collections, categoryId]
  );

  const handleToggleWishlist = async (listingId: string) => {
    if (!token) return;
    await toggleListing(token, listingId);
    setCards((prev) => prev.filter((c) => c.listingId !== listingId));
  };

  if (!token) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-8">
        <p className="text-neutral-600">Please log in to view your collection.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-8">
      <Link href="/wishlists" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900">
        <ChevronLeft className="size-4" />
        Back to wishlists
      </Link>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900">
        {collection?.name || "Collection"}
      </h1>
      <p className="mt-2 text-neutral-500">
        {(items[categoryId] || []).length} saved
      </p>

      {loading ? (
        <p className="mt-8 text-neutral-600">Loading item...</p>
      ) : cards.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8">
          <p className="text-neutral-700">Collection doesn't have any items.</p>
        </div>
      ) : (
        <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((listing) => (
            <ListingCard
              key={listing.listingId}
              listing={listing}
              wished={!!listingMap[listing.listingId]}
              wishlistLoading={!!pendingByListingId[listing.listingId]}
              onToggleWishlist={() => handleToggleWishlist(listing.listingId)}
            />
          ))}
        </section>
      )}
    </main>
  );
}
