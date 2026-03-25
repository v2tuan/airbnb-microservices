"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Heart } from "lucide-react";
import { formatPrice } from "@/contants";

export interface HomeListingCardProps {
  listingId: string;
  title: string;
  city: string;
  country: string;
  coverImageUrl: string;
  basePrice: number;
  currency: string;
  rating?: number;
  isGuestFavorite?: boolean;
  instantBook?: boolean;
}

interface ListingCardProps {
  listing: HomeListingCardProps;
  wished?: boolean;
  wishlistLoading?: boolean;
  onToggleWishlist?: () => void;
}

const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  wished = false,
  wishlistLoading = false,
  onToggleWishlist,
}) => {
  return (
    <div className="group relative flex w-full flex-col gap-2">
      <Link href={`/rooms/${listing.listingId}`} className="flex w-full flex-col gap-2">
        {/* Image Container */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-neutral-200">
          <Image
            src={listing.coverImageUrl}
            alt={listing.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 767px) 75vw, (max-width: 1023px) 20vw, 15vw"
          />

          {(listing.isGuestFavorite || listing.instantBook) && (
            <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 shadow-sm">
              <span className="text-[12px] font-bold text-neutral-900">
                Guest favorite
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-start justify-between gap-1">
            <h3 className="line-clamp-1 flex-1 text-[15px] font-bold text-neutral-900">
              {listing.title}
            </h3>
          </div>

          <p className="line-clamp-1 text-[14px] text-neutral-500">
            {listing.city}, {listing.country}
          </p>

          <div className="mt-1 flex gap-1 text-[12px]">
            <span className="font-bold">{formatPrice(listing.basePrice, listing.currency)}</span>
            <span className="text-neutral-600"> for 2 nights</span>
            {listing.rating && (
              <div className="flex items-center gap-1">
                <Star size={10} className="fill-neutral-900" />
                <span className="text-[12px] font-medium">{listing.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </Link>

      <button
        type="button"
        disabled={wishlistLoading}
        onClick={onToggleWishlist}
        className={`absolute right-3 top-3 z-20 transition hover:scale-110 ${
          wished ? "text-rose-500" : "text-white/90 hover:text-rose-500"
        } ${wishlistLoading ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <Heart
          size={24}
          strokeWidth={2}
          className={`drop-shadow-md ${wished ? "fill-rose-500" : ""}`}
        />
      </button>
    </div>
  );
};

export default ListingCard;