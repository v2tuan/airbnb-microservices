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
}

const ListingCard: React.FC<{ listing: HomeListingCardProps }> = ({ listing }) => {

  return (
    <Link href={`/rooms/${listing.listingId}`} className="group flex flex-col gap-2 w-full cursor-pointer">
      
      <div className="relative aspect-[1/1] w-full overflow-hidden rounded-2xl bg-gray-200">
        <Image
          src={listing.coverImageUrl}
          alt={listing.title}
          // Tăng trải nghiệm hover (phóng to nhẹ)
          className="h-full w-full object-cover group-hover:scale-110 transition duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
        />

        {listing.isGuestFavorite && (
          <div className="absolute top-4 left-4 bg-white/95 px-3 py-1 rounded-full shadow-md border border-black/5">
            <span className="text-sm font-semibold text-black tracking-tight">
              Guest favorite
            </span>
          </div>
        )}

        <button 
          type="button" 
          onClick={(e) => {
            e.preventDefault(); // Ngăn click lan ra thẻ Link
            console.log("Add to Wishlist", listing.listingId);
          }}
          className="absolute top-4 right-4 text-white/70 hover:text-rose-500 hover:scale-110 transition"
        >
          <Heart size={26} strokeWidth={2} className="group-hover:text-rose-500" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5 mt-2">
        
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-[15px] text-black truncate flex-1 pr-2">
            Room in {listing.city}
          </h3>
          
          {listing.rating && (
            <div className="flex items-center gap-1.5 min-w-[50px] justify-end">
              <Star size={14} className="text-black fill-black" />
              <span className="text-sm font-semibold text-black tracking-tight">
                {listing.rating.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        
        <p className="text-black text-[15px] font-normal tracking-tight">
          <span className="font-semibold text-black">
            {formatPrice(listing.basePrice, listing.currency)}
          </span>
          <span className="text-gray-600"> for 2 nights</span>
        </p>
      </div>
    </Link>
  );
};

export default ListingCard;