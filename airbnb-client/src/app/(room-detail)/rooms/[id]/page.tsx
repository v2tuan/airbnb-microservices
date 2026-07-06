"use client";

import {
  BedDouble,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Share,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { activityAPI } from "@/api/endpoints/activity";
import {
  type ListingResponse,
  listingAPI,
  unwrapApiData,
} from "@/api/endpoints/listing";
import { ratingAPI } from "@/api/endpoints/rating";
import { type PublicUserProfile, userAPI } from "@/api/endpoints/user";
import { BookingCard } from "@/components/listing/BookingCard";
import { ListingGallery } from "@/components/listing/ListingGallery";
import { ListingInfo } from "@/components/listing/ListingInfo";
import { ListingRatingPanel } from "@/components/listing/ListingRatingPanel";
import { RoomWishlistButton } from "@/components/listing/RoomWishlistButton";
import { Calendar } from "@/components/ui/calendar";

type RatingRecord = {
  id?: string;
  bookingId?: string;
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
  photos?: Array<{
    id?: string;
    imageUrl?: string;
    sortOrder?: number;
  }>;
};

type HostPreview = {
  id?: string;
  keycloakUserId?: string;
  fullName?: string;
  avatarUrl?: string;
  isSuperhost?: boolean;
  hostSince?: string;
};

const formatHostSince = (hostSince?: string) => {
  if (!hostSince) return "Joined recently";

  const date = new Date(hostSince);
  if (Number.isNaN(date.getTime())) return "Joined recently";

  return `Joined ${date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })}`;
};

const firstDefinedString = (...values: Array<unknown>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
};

const getAverageFromRatings = (ratings: RatingRecord[]) => {
  const values = ratings
    .map((rating) => rating.overallRating)
    .filter(
      (value): value is number =>
        typeof value === "number" && !Number.isNaN(value),
    );

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const buildMapEmbedUrl = (listing: ListingResponse) => {
  const hasCoordinates =
    Number.isFinite(listing.latitude) &&
    Number.isFinite(listing.longitude) &&
    listing.latitude !== 0 &&
    listing.longitude !== 0;

  if (hasCoordinates) {
    return `https://www.google.com/maps?q=${listing.latitude},${listing.longitude}&z=14&output=embed`;
  }

  const query = encodeURIComponent(
    `${listing.address}, ${listing.city}, ${listing.country}`,
  );
  return `https://www.google.com/maps?q=${query}&z=14&output=embed`;
};

const toRatingsArray = (payload: unknown): unknown[] => {
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

const normalizeRating = (raw: unknown): RatingRecord => {
  const record = raw as Record<string, unknown>;
  const reviewer = (record?.reviewer ??
    record?.user ??
    record?.profile ??
    null) as Record<string, unknown> | null;

  return {
    id: typeof record?.id === "string" ? record.id : undefined,
    userId:
      typeof record?.userId === "string"
        ? record.userId
        : typeof record?.user_id === "string"
          ? record.user_id
          : typeof reviewer?.userId === "string"
            ? reviewer.userId
            : typeof reviewer?.id === "string"
              ? reviewer.id
              : undefined,
    hostId:
      typeof record?.hostId === "string"
        ? record.hostId
        : typeof record?.host_id === "string"
          ? record.host_id
          : undefined,
    overallRating:
      typeof record?.overallRating === "number"
        ? record.overallRating
        : typeof record?.overall_rating === "number"
          ? record.overall_rating
          : undefined,
    cleanliness:
      typeof record?.cleanliness === "number" ? record.cleanliness : undefined,
    accuracy:
      typeof record?.accuracy === "number" ? record.accuracy : undefined,
    checkIn:
      typeof record?.checkIn === "number"
        ? record.checkIn
        : typeof record?.check_in === "number"
          ? record.check_in
          : undefined,
    communication:
      typeof record?.communication === "number"
        ? record.communication
        : undefined,
    location:
      typeof record?.location === "number" ? record.location : undefined,
    value: typeof record?.value === "number" ? record.value : undefined,
    review: typeof record?.review === "string" ? record.review : undefined,
    createdAt:
      typeof record?.createdAt === "string"
        ? record.createdAt
        : typeof record?.created_at === "string"
          ? record.created_at
          : undefined,
    reviewerFullName: firstDefinedString(
      record?.reviewerFullName,
      record?.reviewer_full_name,
      record?.fullName,
      reviewer?.fullName,
      reviewer?.full_name,
      reviewer?.name,
    ),
    reviewerAvatarUrl: firstDefinedString(
      record?.reviewerAvatarUrl,
      record?.reviewer_avatar_url,
      record?.avatarUrl,
      record?.avatar,
      reviewer?.avatarUrl,
      reviewer?.avatar,
      reviewer?.profilePicture,
      reviewer?.profile_picture,
      reviewer?.image,
    ),
  };
};

function DetailMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-[#ebebeb] bg-white px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f7f7] text-[#222222]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          {label}
        </p>
        <p className="text-sm font-medium text-[#222222]">{value}</p>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff385c]">
        {eyebrow}
      </p>
      <h3 className="text-[22px] font-semibold tracking-tight text-[#222222]">
        {title}
      </h3>
      {subtitle ? (
        <p className="text-sm leading-6 text-zinc-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

export default function RoomDetail() {
  const params = useParams<{ id: string }>();
  const { id } = params;

  const [listing, setListing] = useState<ListingResponse | null>(null);
  const [host, setHost] = useState<HostPreview | null>(null);
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchRatings = async () => {
      try {
        const [ratingsResponse, averageResponse] = await Promise.allSettled([
          ratingAPI.getRatingsByListing(id),
          ratingAPI.getAverageRating(id),
        ]);

        if (cancelled) return;

        const rawRatingsPayload =
          ratingsResponse.status === "fulfilled"
            ? ratingsResponse.value.data
            : [];

        setRatings(toRatingsArray(rawRatingsPayload).map(normalizeRating));
        setAverageRating(
          averageResponse.status === "fulfilled"
            ? averageResponse.value.data
            : 0,
        );
      } catch (ratingError) {
        console.error("Failed to fetch listing ratings:", ratingError);
      }
    };

    const fetchHost = async (hostId?: string) => {
      if (!hostId) return;

      try {
        const hostResponse = await userAPI.getPublicProfileById(hostId);
        if (cancelled) return;

        const hostProfile = hostResponse.data as PublicUserProfile | undefined;

        setHost({
          id:
            hostProfile?.keycloakUserId ??
            hostProfile?.userId?.toString() ??
            hostId,
          keycloakUserId: hostProfile?.keycloakUserId ?? hostId,
          fullName: hostProfile?.fullName,
          avatarUrl: hostProfile?.avatarUrl,
          isSuperhost: hostProfile?.superHost,
          hostSince: hostProfile?.joinedAt,
        });
      } catch (hostError) {
        console.error("Failed to fetch host profile:", hostError);
        if (!cancelled) setHost(null);
      }
    };

    const fetchData = async () => {
      try {
        const listingResponse = await listingAPI.getRoomById(id);
        const listingData = unwrapApiData(listingResponse.data);

        if (!listingData) {
          notFound();
          return;
        }

        if (cancelled) return;
        setListing(listingData);
        setLoading(false);

        void fetchRatings();
        void fetchHost(listingData.hostId);
      } catch (fetchError) {
        console.error("Failed to fetch listing:", fetchError);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!listing?.listingId) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    void activityAPI.recordActivity(token, listing.listingId, {
      eventType: "VIEW",
    });
  }, [listing?.listingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-10 text-center text-zinc-500">
        Loading...
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-white px-4 py-10 text-center text-zinc-500">
        Error loading room details. Please try again later.
      </div>
    );
  }

  const hostProfileId = host?.keycloakUserId ?? host?.id ?? listing.hostId;
  const reviewCount = ratings.length;
  const effectiveAverageRating =
    averageRating > 0 ? averageRating : getAverageFromRatings(ratings);
  const totalGuests = listing.maxGuests;
  const bedSummary = `${listing.numBeds} beds`;
  const amenities = (listing.amenities ?? []).filter(Boolean);
  const sleepCount = Math.max(1, Math.min(listing.numBedrooms || 1, 3));
  const bedsPerRoom = Math.max(
    1,
    Math.round((listing.numBeds || sleepCount) / sleepCount),
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 border-b border-[#ebebeb] pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff385c]">
                  Stay detail
                </p>
                <h1 className="text-[28px] font-semibold tracking-tight text-[#222222] sm:text-[32px]">
                  {listing.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                  <span className="font-medium text-[#222222]">
                    {listing.address}, {listing.city}, {listing.country}
                  </span>
                  <span className="hidden h-1 w-1 rounded-full bg-zinc-300 sm:inline-block" />
                  <span>{totalGuests} guests</span>
                  <span className="hidden h-1 w-1 rounded-full bg-zinc-300 sm:inline-block" />
                  <span>{bedSummary}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-[#dddddd] bg-white px-4 py-2 text-sm font-medium text-[#222222] transition hover:border-[#222222]"
                >
                  <Share className="h-4 w-4" />
                  Share
                </button>
                <RoomWishlistButton listingId={listing.listingId} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailMeta
                icon={Users}
                label="Guests"
                value={`${listing.maxGuests} max`}
              />
              <DetailMeta
                icon={CalendarDays}
                label="Beds"
                value={`${listing.numBeds} available`}
              />
              <DetailMeta
                icon={Star}
                label="Rating"
                value={
                  reviewCount > 0
                    ? `${effectiveAverageRating.toFixed(1)} from ${reviewCount}`
                    : "No reviews yet"
                }
              />
              <DetailMeta
                icon={Sparkles}
                label="Host"
                value={host?.isSuperhost ? "Superhost" : "Member host"}
              />
            </div>
          </div>

          <div className="mt-6">
            <ListingGallery
              photos={listing.photos ?? []}
              title={listing.title}
            />
          </div>

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-8">
              <section className="border-b border-[#ebebeb] pb-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7f7f7] text-[#222222]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      Hosted by
                    </p>
                    {hostProfileId ? (
                      <Link
                        href={`/users/profile/${hostProfileId}`}
                        className="mt-1 inline-block text-lg font-semibold text-[#222222] underline-offset-4 hover:underline"
                      >
                        {host?.fullName ??
                          host?.keycloakUserId ??
                          listing.hostId}
                      </Link>
                    ) : (
                      <p className="mt-1 text-lg font-semibold text-[#222222]">
                        {host?.fullName ??
                          host?.keycloakUserId ??
                          listing.hostId}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-zinc-500">
                      {host?.hostSince
                        ? formatHostSince(host.hostSince)
                        : "Joined recently"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[16px] bg-[#f7f7f7] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                      Status
                    </p>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#222222]">
                      <CheckCircle2 className="h-4 w-4 text-[#ff385c]" />
                      {host?.isSuperhost ? "Superhost" : "Member host"}
                    </p>
                  </div>
                  <div className="rounded-[16px] bg-[#f7f7f7] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                      Joined
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#222222]">
                      {host?.hostSince
                        ? formatHostSince(host.hostSince)
                        : "Joined recently"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Public host profile
                    </p>
                  </div>
                </div>
              </section>

              <section className="border-b border-[#ebebeb] pb-8">
                <ListingInfo
                  data={listing}
                  hostName={
                    host?.fullName ?? host?.keycloakUserId ?? listing.hostId
                  }
                />
              </section>

              <section className="border-b border-[#ebebeb] pb-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <SectionHeading
                    eyebrow="Where you'll sleep"
                    title="Sleeping arrangements"
                    subtitle="The layout is kept simple so guests can scan the sleeping setup at a glance."
                  />
                  <p className="text-sm text-zinc-500">
                    {listing.numBedrooms} bedroom
                    {listing.numBedrooms === 1 ? "" : "s"} · {listing.numBeds}{" "}
                    beds
                  </p>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: sleepCount }, (_, index) => ({
                    key: `sleeping-space-${index + 1}`,
                    position: index,
                  })).map((sleepingSpace) => (
                    <div
                      key={sleepingSpace.key}
                      className="rounded-[18px] border border-[#ebebeb] bg-[#f7f7f7] p-5"
                    >
                      <BedDouble className="h-6 w-6 text-[#222222]" />
                      <p className="mt-4 text-sm font-semibold text-[#222222]">
                        Bedroom {sleepingSpace.position + 1}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {bedsPerRoom} bed{bedsPerRoom === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border-b border-[#ebebeb] pb-8">
                <SectionHeading
                  eyebrow="What this place offers"
                  title="Amenities"
                  subtitle="The items below come from the listing service and should stay compact and readable."
                />

                <div className="mt-5 flex flex-wrap gap-3">
                  {amenities.length > 0 ? (
                    amenities.slice(0, 14).map((amenity) => (
                      <span
                        key={amenity.amenityId}
                        className="inline-flex items-center gap-2 rounded-full border border-[#dddddd] bg-white px-4 py-2 text-sm font-medium text-[#222222]"
                      >
                        <span className="size-2 rounded-full bg-[#ff385c]" />
                        {amenity.name}
                      </span>
                    ))
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[#dddddd] bg-[#f7f7f7] px-4 py-3 text-sm text-zinc-500">
                      No amenities published yet.
                    </div>
                  )}
                </div>
              </section>

              <section className="border-b border-[#ebebeb] pb-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <SectionHeading
                    eyebrow="Calendar"
                    title="Availability"
                    subtitle="Use the booking panel to pick dates. The calendar below is there to keep the page visually aligned with Airbnb's listing flow."
                  />
                  <p className="text-sm text-zinc-500">
                    Check-in and checkout are selected in the booking card
                  </p>
                </div>

                <div className="mt-5 overflow-hidden rounded-[20px] border border-[#ebebeb] bg-white p-3">
                  <Calendar
                    mode="range"
                    defaultMonth={new Date()}
                    numberOfMonths={2}
                  />
                </div>
              </section>

              <section className="border-b border-[#ebebeb] pb-8">
                <SectionHeading
                  eyebrow="Where you'll be"
                  title="Location"
                  subtitle="This section mirrors the official Airbnb page: map first, then the neighborhood context."
                />

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_320px]">
                  <div className="overflow-hidden rounded-[20px] border border-[#ebebeb] bg-[#f7f7f7]">
                    <iframe
                      title="Listing location map"
                      src={buildMapEmbedUrl(listing)}
                      className="h-[320px] w-full"
                      loading="lazy"
                    />
                  </div>

                  <div className="rounded-[20px] border border-[#ebebeb] bg-[#f7f7f7] p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#ff385c] shadow-sm">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                          Address
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#222222]">
                          {listing.address}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {listing.city}, {listing.country}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 text-sm text-zinc-600">
                      <div className="flex items-center justify-between">
                        <span>Latitude</span>
                        <span className="font-medium text-[#222222]">
                          {listing.latitude}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Longitude</span>
                        <span className="font-medium text-[#222222]">
                          {listing.longitude}
                        </span>
                      </div>
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#ff385c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e61e4d]"
                    >
                      Open in maps
                    </a>
                  </div>
                </div>
              </section>

              <section className="pb-2">
                <ListingRatingPanel
                  averageRating={averageRating}
                  ratings={ratings}
                />
              </section>
            </div>

            <div className="lg:pt-2">
              <BookingCard
                roomId={listing.listingId}
                maxGuests={listing.maxGuests}
                petsAllowed={true}
                pricing={
                  listing.pricing ?? {
                    basePrice: 0,
                    currency: "USD",
                    cleaningFee: 0,
                    serviceFeePercentage: 0,
                  }
                }
                rating={averageRating}
                reviewCount={ratings.length}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
