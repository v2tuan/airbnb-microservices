"use client";

import { Heart, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ListingResponse } from "@/api/endpoints/listing";
import { formatPrice } from "@/contants";

const fallbackImage =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop";

function resolveCoverImage(listing: ListingResponse) {
  return (
    listing.photos?.find((photo) => photo.isCover)?.photoUrl ??
    listing.photos?.[0]?.photoUrl ??
    fallbackImage
  );
}

function resolveRating(listingId: string) {
  const seed = listingId
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return (4.65 + (seed % 31) / 100).toFixed(2);
}

function formatStayDetails(listing: ListingResponse) {
  return [
    listing.roomType?.replace("_", " ").toLowerCase(),
    `${listing.maxGuests} guests`,
    `${listing.numBedrooms} bedrooms`,
    `${listing.numBeds} beds`,
  ]
    .filter(Boolean)
    .join(" · ");
}

interface SearchListingCardProps {
  listing: ListingResponse;
}

export default function SearchListingCard({ listing }: SearchListingCardProps) {
  const coverImageUrl = resolveCoverImage(listing);
  const basePrice = listing.pricing?.basePrice ?? 0;
  const currency = listing.pricing?.currency ?? "USD";

  return (
    <Link href={`/rooms/${listing.listingId}`} className="group block">
      <article>
        <div className="relative aspect-[20/13] overflow-hidden rounded-2xl bg-neutral-100">
          <Image
            src={coverImageUrl}
            alt={listing.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 767px) 92vw, (max-width: 1535px) 44vw, 28vw"
          />

          <button
            type="button"
            aria-label="Save to wishlist"
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full transition"
            onClick={(event) => event.preventDefault()}
          >
            <Heart
              className="size-[22px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
              stroke="white"
              strokeWidth={2}
              fill="transparent"
            />
          </button>

          {listing.instantBook ? (
            <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-950 shadow-sm">
              Instant Book
            </span>
          ) : null}
        </div>

        <div className="mt-3 space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="line-clamp-1 text-sm font-semibold text-neutral-950">
              {listing.city}, {listing.country}
            </h2>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm text-neutral-950">
              <Star className="size-3.5 fill-neutral-950" />
              {resolveRating(listing.listingId)}
            </span>
          </div>

          <p className="line-clamp-1 text-sm text-neutral-500">
            {listing.title}
          </p>
          <p className="line-clamp-1 text-sm text-neutral-500">
            {formatStayDetails(listing)}
          </p>
          <p className="pt-1 text-sm text-neutral-950">
            <span className="font-semibold underline">
              {formatPrice(basePrice, currency)}
            </span>
            <span className="text-neutral-500"> / night</span>
          </p>
        </div>
      </article>
    </Link>
  );
}
