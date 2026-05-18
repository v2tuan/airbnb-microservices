'use client'

import { ratingAPI } from "@/api/endpoints/rating";
import { listingAPI } from "@/api/endpoints/listing";
import { BookingCard } from "@/components/listing/BookingCard";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { ListingInfo } from "@/components/listing/ListingInfo";
import { ListingRatingForm } from "@/components/listing/ListingRatingForm";
import { ListingRatingPanel } from "@/components/listing/ListingRatingPanel";
import { RoomWishlistButton } from "@/components/listing/RoomWishlistButton";
import { Share } from "lucide-react";
import {notFound, useParams} from "next/navigation";
import {useEffect, useState} from "react";

interface PageProps {
  params: {id: string}
}

type RatingRecord = {
  id?: string;
  userId?: string;
  hostId?: string;
  overallRating?: number;
  cleanliness?: number;
  accuracy?: number;
  checkIn?: number;
  communication?: number;
  location?: number;
  value?: number;
  review?: string;
  createdAt?: string;
  reviewerFullName?: string;
  reviewerAvatarUrl?: string;
};

const firstDefinedString = (...values: Array<unknown>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
};

const toRatingsArray = (payload: unknown): any[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.result)) {
      return obj.result;
    }
    if (Array.isArray(obj.data)) {
      return obj.data;
    }
  }

  return [];
};

const normalizeRating = (raw: any): RatingRecord => {
  const reviewer = raw?.reviewer ?? raw?.user ?? raw?.profile ?? null;

  return {
    id: raw?.id,
    userId: raw?.userId ?? raw?.user_id ?? reviewer?.userId ?? reviewer?.id,
    hostId: raw?.hostId ?? raw?.host_id,
    overallRating: raw?.overallRating ?? raw?.overall_rating,
    cleanliness: raw?.cleanliness,
    accuracy: raw?.accuracy,
    checkIn: raw?.checkIn ?? raw?.check_in,
    communication: raw?.communication,
    location: raw?.location,
    value: raw?.value,
    review: raw?.review,
    createdAt: raw?.createdAt ?? raw?.created_at,
    reviewerFullName: firstDefinedString(
      raw?.reviewerFullName,
      raw?.reviewer_full_name,
      raw?.fullName,
      reviewer?.fullName,
      reviewer?.full_name,
      reviewer?.name
    ),
    reviewerAvatarUrl: firstDefinedString(
      raw?.reviewerAvatarUrl,
      raw?.reviewer_avatar_url,
      raw?.avatarUrl,
      raw?.avatar,
      reviewer?.avatarUrl,
      reviewer?.avatar,
      reviewer?.profilePicture,
      reviewer?.profile_picture,
      reviewer?.image
    ),
  };
};

export default function RoomDetail () {
  const params = useParams<{ id: string }>();

  console.log(params.id);

  const { id } = params;

  const [listing, setListing] = useState<any>(null);
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [averageRating, setAverageRating] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingResponse, ratingsResponse, averageResponse] =
            await Promise.allSettled([
              listingAPI.getRoomById(id),
              ratingAPI.getRatingsByListing(id),
              ratingAPI.getAverageRating(id),
            ]);

        if (listingResponse.status !== "fulfilled") {
          throw listingResponse.reason;
        }

        const listingData = listingResponse.value.data.result;

        if (!listingData) {
          notFound();
          return;
        }

        const rawRatingsPayload =
            ratingsResponse.status === "fulfilled"
                ? ratingsResponse.value.data
                : [];

        const normalizedRatings =
            toRatingsArray(rawRatingsPayload).map(normalizeRating);

        const avgRating =
            averageResponse.status === "fulfilled"
                ? averageResponse.value.data
                : 0;

        setListing(listingData);
        setRatings(normalizedRatings);
        setAverageRating(avgRating);
      } catch (error) {
        console.error("Failed to fetch listing:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error || !listing) {
    return <div>Error loading room details. Please try again later.</div>;
  }

  return (
      <main className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-8">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{listing.title}</h1>

          <div className="mt-2 flex items-center justify-between gap-4">
          <span className="underline font-medium text-sm cursor-pointer">
            {listing.address}, {listing.city}, {listing.country}
          </span>

            <div className="flex items-center gap-4 text-sm font-medium">
              <button
                  type="button"
                  className="hidden md:inline-flex items-center gap-2 underline hover:bg-zinc-100 px-2 py-1 rounded-md transition"
              >
                <Share className="h-4 w-4" />
                Share
              </button>

              <RoomWishlistButton listingId={listing.listingId} />
            </div>
          </div>
        </div>

        {/* Photos Grid */}
        <ListingGallery photos={listing.photos} />

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mt-12">
          {/* Left Column */}
          <div className="md:col-span-3">
            <ListingInfo data={listing} />
          </div>

          {/* Right Column */}
          <div className="relative md:col-span-2 m-5">
            <BookingCard
                roomId={listing.listingId}
                maxGuests={listing.maxGuests}
                petsAllowed={true}
                pricing={listing.pricing}
                rating={averageRating}
                reviewCount={ratings.length}
            />
          </div>
        </div>

        <div className="mt-12">
          <ListingRatingPanel
              averageRating={averageRating}
              ratings={ratings}
          />

          <ListingRatingForm
              listingId={listing.listingId}
              hostId={listing.hostId}
          />
        </div>
      </main>
  );
}