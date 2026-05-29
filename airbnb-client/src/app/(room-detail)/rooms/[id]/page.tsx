'use client'

import { userAPI, type PublicProfilePageData } from "@/api/endpoints/user";
import { ratingAPI } from "@/api/endpoints/rating";
import { listingAPI, unwrapApiData } from "@/api/endpoints/listing";
import { BookingCard } from "@/components/listing/BookingCard";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { ListingInfo } from "@/components/listing/ListingInfo";
import { ListingRatingForm } from "@/components/listing/ListingRatingForm";
import { ListingRatingPanel } from "@/components/listing/ListingRatingPanel";
import { RoomWishlistButton } from "@/components/listing/RoomWishlistButton";
import { CalendarDays, CheckCircle2, MessageSquare, Share, Sparkles, Star, Users } from "lucide-react";
import Link from "next/link";
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

type HostPreview = {
  id?: string;
  fullName?: string;
  avatarUrl?: string;
  isSuperhost?: boolean;
  hostSince?: string;
  location?: string;
  responseRate?: string;
  responseTime?: string;
};

const formatHostSince = (hostSince?: string) => {
  if (!hostSince) return "Joined recently";

  const date = new Date(hostSince);
  if (Number.isNaN(date.getTime())) return "Joined recently";

  return `Joined ${date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
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
  const [host, setHost] = useState<HostPreview | null>(null);
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

        const listingData = unwrapApiData(listingResponse.value.data);

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

        const hostId = listingData?.hostId;
        if (hostId) {
          try {
            const hostResponse = await userAPI.getPublicProfilePageData(hostId, { reviewPage: 0, listingPage: 0 });
            const hostProfile = (hostResponse.data as PublicProfilePageData | undefined)?.host;

            setHost({
              id: hostProfile?.id ?? hostId,
              fullName: hostProfile?.fullName,
              avatarUrl: hostProfile?.avatarUrl,
              isSuperhost: hostProfile?.isSuperhost,
              hostSince: hostProfile?.hostSince,
              location: hostProfile?.location,
              responseRate: hostProfile?.responseRate,
              responseTime: hostProfile?.responseTime,
            });
          } catch (hostError) {
            console.error("Failed to fetch host profile:", hostError);
            setHost(null);
          }
        }
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

  const hostProfileId = host?.id ?? listing?.hostId;

  return (
      <main className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,56,92,0.06),transparent_30%),linear-gradient(180deg,#fff_0%,#fff_60%,#f8fafc_100%)] px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff385c]">Stay detail</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">{listing.title}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                <span className="font-medium text-zinc-700">{listing.address}, {listing.city}, {listing.country}</span>
                <span className="hidden h-1 w-1 rounded-full bg-zinc-300 sm:inline-block" />
                <span>{listing.maxGuests} guests</span>
                <span className="hidden h-1 w-1 rounded-full bg-zinc-300 sm:inline-block" />
                <span>{listing.numBeds} beds</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-900 hover:text-zinc-950"
              >
                <Share className="h-4 w-4" />
                Share
              </button>

              <RoomWishlistButton listingId={listing.listingId} />
            </div>
          </div>

          <ListingGallery photos={listing.photos ?? []} title={listing.title} />

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-8">
              <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] md:p-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Hosted by</p>
                    {hostProfileId ? (
                      <Link
                        href={`/users/profile/${hostProfileId}`}
                        className="mt-1 inline-block text-xl font-semibold text-zinc-950 underline-offset-4 hover:underline"
                      >
                        {host?.fullName ?? "LocalHost"}
                      </Link>
                    ) : (
                      <p className="mt-1 text-xl font-semibold text-zinc-950">{host?.fullName ?? "LocalHost"}</p>
                    )}
                    <p className="mt-1 text-sm text-zinc-500">{host?.hostSince ? formatHostSince(host.hostSince) : "Joined recently"}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Status</p>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {host?.isSuperhost ? "Superhost" : "Member host"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Response</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900">{host?.responseRate ?? "Fast response"}</p>
                    <p className="mt-1 text-xs text-zinc-500">{host?.responseTime ?? "Typically replies soon"}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Location</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900">{host?.location ?? listing.city}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] md:p-8">
                <ListingInfo data={listing} hostName={host?.fullName ?? "LocalHost"} />
              </section>

              <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] md:p-8">
                <ListingRatingPanel
                    averageRating={averageRating}
                    ratings={ratings}
                />

                <ListingRatingForm
                    listingId={listing.listingId}
                    hostId={listing.hostId}
                />
              </section>
            </div>

            <div className="lg:sticky lg:top-24 lg:self-start">
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
        </div>
      </main>
  );
}
