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
  reviewCount?: number;    
  isGuestFavorite?: boolean;
  instantBook?: boolean;
}

const ListingCard: React.FC<{ listing: HomeListingCardProps }> = ({ listing }) => {

  return (
    <Link href={`/rooms/${listing.listingId}`} className="group flex w-full cursor-pointer flex-col gap-3">
      
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-neutral-200">
        <Image
          src={listing.coverImageUrl}
          alt={listing.title}
          fill
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          sizes="(max-width: 767px) 50vw, (max-width: 1023px) 20vw, 14.3vw"
          priority={false}
        />

        {(listing.isGuestFavorite || listing.instantBook) && (
          <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 shadow-sm">
            <span className="text-xs font-semibold leading-none text-neutral-900 md:text-sm">
              Guest favorite
            </span>
          </div>
        )}

        <button 
          type="button" 
          onClick={(e) => {
            e.preventDefault();
            console.log("Add to Wishlist", listing.listingId);
          }}
          className="absolute right-3 top-3 rounded-full p-1 text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)] transition hover:scale-110 hover:text-rose-500"
        >
          <Heart size={26} strokeWidth={1.8} className="group-hover:text-rose-500" />
        </button>
      </div>

      <div className="flex flex-col gap-1">
        
        <div className="flex items-center justify-between gap-2">
          <h3 className="line-clamp-2 flex-1 text-base font-semibold leading-[1.25] tracking-tight text-neutral-900 md:text-[17px]">
            {listing.title}
          </h3>
          
          {listing.rating && (
            <div className="flex min-w-[74px] items-center justify-end gap-1">
              <Star size={12} className="fill-neutral-900 text-neutral-900" />
              <span className="text-sm font-medium tracking-tight text-neutral-800">
                {listing.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <p className="text-sm text-neutral-600">
          {listing.city}, {listing.country}
        </p>
        
        <p className="text-sm tracking-tight text-neutral-600 md:text-[15px]">
          <span className="font-semibold text-neutral-900 underline decoration-neutral-500 underline-offset-[3px]">
            {formatPrice(listing.basePrice, listing.currency)}
          </span>
          <span> for 2 nights</span>
        </p>
      </div>
    </Link>
  );
};

export default ListingCard;