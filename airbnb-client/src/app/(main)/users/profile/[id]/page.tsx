import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Globe,
  Home,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type PublicProfilePageData, userAPI } from "@/api/endpoints/user";
import SendMessageButton from '@/components/messages/SendMessageButton'

interface PageProps {
  params: Promise<{ id: string }>;
}

function resolveProfilePayload(payload: unknown): PublicProfilePageData | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const source = payload as Record<string, unknown>;
  const nested = source.data;

  if (nested && typeof nested === "object") {
    return nested as PublicProfilePageData;
  }

  return source as PublicProfilePageData;
}

function initials(name?: string) {
  if (!name || !name.trim()) {
    return "GU";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatJoinDate(joinedAt?: string) {
  if (!joinedAt) {
    return "Joined recently";
  }

  const date = new Date(joinedAt);
  if (Number.isNaN(date.getTime())) {
    return "Joined recently";
  }

  return `Joined in ${date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
}

function formatNumber(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function formatCompactNumber(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function listingHref(listingId?: string) {
  return listingId ? `/rooms/${listingId}` : "/search";
}

function profileName(profile: PublicProfilePageData, routeId: string) {
  if (profile.host?.fullName?.trim()) {
    return profile.host.fullName.trim();
  }

  if (routeId.length > 10) {
    return `${routeId.slice(0, 6)}...${routeId.slice(-4)}`;
  }

  return routeId;
}

function formatDateLabel(value?: string) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ratingLabel(value?: number) {
  if (typeof value !== "number") {
    return "0.0";
  }

  return value.toFixed(1);
}

function getAboutText(profile: PublicProfilePageData, displayName: string) {
  if (profile.host?.isSuperhost) {
    return `${displayName} is an experienced host with a strong track record on Airbnb. Guests can expect a polished stay, quick communication, and a profile that reflects verified activity across listings and reviews.`;
  }

  return `${displayName} is an active Airbnb member. This public profile shows the identity card, membership date, and any trips, reviews, or listings that are available from the backend.`;
}

function getBadgeLabel(profile: PublicProfilePageData) {
  return profile.host?.isSuperhost ? "Superhost" : "Airbnb member";
}

function renderStars(rating?: number) {
  const value = typeof rating === "number" ? rating : 0;
  return [1, 2, 3, 4, 5].map((star) => (
    <Star
      key={star}
      className={
        star <= Math.round(value) ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"
      }
    />
  ));
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { id } = await params;

  try {
    const response = await userAPI.getPublicProfilePageData(id, {
      reviewPage: 0,
      listingPage: 0,
    });
    const profile = resolveProfilePayload(response.data);

    if (!profile?.host) {
      return notFound();
    }

    const displayName = profileName(profile, id);
    const joinedText = formatJoinDate(profile.host.hostSince);
    const aboutText = getAboutText(profile, displayName);
    const reviews = profile.reviews?.items ?? [];
    const listings = profile.listings?.items ?? [];
    const rating = profile.stats?.overallRating;
    const reviewsCount = profile.stats?.reviewsCount;
    const listingsCount = profile.stats?.activeListingsCount;

    return (
      <main className="relative min-h-screen overflow-hidden bg-[#f7f5f2]">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,rgba(255,56,92,0.18),transparent_36%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.12),transparent_28%)]" />
        <div className="absolute -left-30 top-24 h-72 w-72 rounded-full bg-[#ff385c]/10 blur-3xl" />
        <div className="absolute -right-25 top-40 h-64 w-64 rounded-full bg-black/5 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl px-4 py-8 md:px-8 lg:px-10">
          <section className="mb-6 flex items-center justify-between gap-4 rounded-3xl border border-black/5 bg-white/85 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur md:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff385c]">
                Public profile
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
                {displayName}
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
                <CalendarDays className="h-4 w-4" />
                {joinedText}
              </p>
            </div>

            <div className="hidden items-center gap-3 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-600 md:flex">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {getBadgeLabel(profile)}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
                <div className="grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]">
                  <div className="relative min-h-80 bg-linear-to-br from-zinc-100 via-white to-rose-50 p-6 md:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,56,92,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.05),transparent_28%)]" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#ff385c]" />
                        Identity verified
                      </div>

                      <div className="mt-12 flex items-end gap-5">
                        {profile.host.avatarUrl ? (
                          <Image
                            src={profile.host.avatarUrl}
                            alt={displayName}
                            width={128}
                            height={128}
                            unoptimized
                            className="h-32 w-32 rounded-[2rem] border border-white object-cover shadow-[0_20px_45px_rgba(15,23,42,0.18)]"
                          />
                        ) : (
                          <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] border border-white bg-zinc-900 text-4xl font-semibold text-white shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
                            {initials(displayName)}
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-medium uppercase tracking-[0.22em] text-zinc-500">
                            Airbnb profile
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white">
                              {profile.host.isSuperhost
                                ? "Superhost"
                                : "Member"}
                            </span>
                            {profile.host.location ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm text-zinc-700 shadow-sm">
                                <MapPin className="h-3.5 w-3.5 text-[#ff385c]" />
                                {profile.host.location}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                      <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700">
                        {getBadgeLabel(profile)}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700">
                        Joined {formatDateLabel(profile.host.hostSince)}
                      </span>
                      {profile.host.identityVerified !== false ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                          Verified identity
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                      {displayName}
                    </h2>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-600">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-current text-[#ff385c]" />
                        <span>{ratingLabel(rating)} rating</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-zinc-500" />
                        <span>{formatNumber(reviewsCount)} reviews</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-zinc-500" />
                        <span>{formatNumber(listingsCount)} listings</span>
                      </div>
                    </div>

                    <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-700">
                      {aboutText}
                    </p>

                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex items-center gap-2 text-zinc-700">
                          <Star className="h-4 w-4 text-[#ff385c]" />
                          <span className="text-sm font-medium">
                            Overall rating
                          </span>
                        </div>
                        <p className="mt-3 text-3xl font-semibold text-zinc-950">
                          {ratingLabel(rating)}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          Average from all reviews
                        </p>
                      </div>

                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex items-center gap-2 text-zinc-700">
                          <MessageSquare className="h-4 w-4 text-[#ff385c]" />
                          <span className="text-sm font-medium">Reviews</span>
                        </div>
                        <p className="mt-3 text-3xl font-semibold text-zinc-950">
                          {formatNumber(reviewsCount)}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          Guest feedback collected
                        </p>
                      </div>

                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex items-center gap-2 text-zinc-700">
                          <ShieldCheck className="h-4 w-4 text-[#ff385c]" />
                          <span className="text-sm font-medium">
                            Membership
                          </span>
                        </div>
                        <p className="mt-3 text-3xl font-semibold text-zinc-950">
                          {profile.host.hostSince ? "Active" : "New"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {joinedText}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ff385c]">
                      About
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                      A profile shaped by real travel history
                    </h3>
                  </div>
                  <div className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-600 md:flex">
                    <Globe className="h-4 w-4" />
                    Airbnb community member
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                    <div className="flex items-center gap-2 text-zinc-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium">Identity</span>
                    </div>
                    <p className="mt-3 text-base leading-7 text-zinc-700">
                      {profile.host.identityVerified !== false
                        ? "This profile indicates a verified identity, so guests can trust the host card shown above."
                        : "Identity verification has not been marked as complete in the backend yet."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                    <div className="flex items-center gap-2 text-zinc-800">
                      <MessageSquare className="h-4 w-4 text-[#ff385c]" />
                      <span className="text-sm font-medium">Response</span>
                    </div>
                    <p className="mt-3 text-base leading-7 text-zinc-700">
                      {profile.host.responseRate || profile.host.responseTime
                        ? `Response rate ${profile.host.responseRate || "N/A"}, response time ${profile.host.responseTime || "N/A"}.`
                        : "Response rate and response time can be surfaced here once the backend provides them."}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ff385c]">
                      Reviews
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                      Guest feedback
                    </h3>
                  </div>
                  <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700">
                    {formatNumber(reviewsCount)} total
                  </div>
                </div>

                {reviews.length > 0 ? (
                  <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {reviews.map((review, index) => (
                      <article
                        key={
                          review.id ??
                          review.listingId ??
                          review.createdAt ??
                          review.comment ??
                          `review-${index}`
                        }
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
                      >
                        <div className="flex items-start gap-4">
                          {review.reviewerAvatarUrl ? (
                            <Image
                              src={review.reviewerAvatarUrl}
                              alt={review.reviewerName ?? "Reviewer"}
                              width={48}
                              height={48}
                              unoptimized
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                              {initials(review.reviewerName)}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-zinc-400">Stayed at</span>
                              {review.listingId ? (
                                <Link
                                  href={listingHref(review.listingId)}
                                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-medium text-[#ff385c] shadow-sm transition hover:bg-rose-50"
                                >
                                  {review.listingTitle || "Listing details"}
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                              ) : (
                                <span className="font-medium text-zinc-400">
                                  Unknown home
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium text-zinc-700 shadow-sm">
                              {renderStars(review.rating)}
                              <span className="ml-1 text-zinc-500">
                                {ratingLabel(review.rating)}
                              </span>
                            </div>

                            <p className="mt-4 text-sm leading-7 text-zinc-700">
                              {review.comment ||
                                "This guest left no written comment, only a rating."}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
                    <p className="text-lg font-medium text-zinc-950">
                      No reviews yet
                    </p>
                    <p className="mt-2 text-sm leading-7 text-zinc-500">
                      Once the backend returns reviews for this user, they will
                      show up here in a familiar Airbnb-style card list.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ff385c]">
                      Listings
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                      Places hosted by this user
                    </h3>
                  </div>
                  <div className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700">
                    {formatNumber(listingsCount)} listings
                  </div>
                </div>

                {listings.length > 0 ? (
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {listings.map((listing, index) => (
                      <article
                        key={
                          listing.id ??
                          listing.title ??
                          listing.city ??
                          `listing-${index}`
                        }
                        className="group overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-50 transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="aspect-4/3 overflow-hidden bg-zinc-200">
                          {listing.thumbnailUrl ? (
                            <Image
                              src={listing.thumbnailUrl}
                              alt={listing.title ?? "Listing"}
                              width={800}
                              height={600}
                              unoptimized
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-zinc-900 via-zinc-800 to-[#ff385c] text-white">
                              <Home className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h4 className="truncate text-base font-semibold text-zinc-950">
                                {listing.title || "Untitled listing"}
                              </h4>
                              <p className="mt-1 text-sm text-zinc-500">
                                {listing.city || "Location not set"}
                              </p>
                            </div>

                            <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm">
                              <Star className="h-3.5 w-3.5 fill-current text-[#ff385c]" />
                              {ratingLabel(listing.avgRating)}
                            </div>
                          </div>

                          <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-700">
                            {listing.shortFeatures ||
                              "Listing details will appear here once the backend provides features and amenities."}
                          </p>

                          <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                            <span>
                              {formatNumber(listing.reviewCount)} reviews
                            </span>
                            <Link
                              href={`/rooms/${listing.id}`}
                              className="inline-flex items-center gap-1 font-medium text-zinc-800 transition hover:text-[#ff385c]"
                            >
                              View listing <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
                    <p className="text-lg font-medium text-zinc-950">
                      No listings yet
                    </p>
                    <p className="mt-2 text-sm leading-7 text-zinc-500">
                      If this is a guest profile, the listing section stays
                      hidden in real Airbnb as well. We keep the same card shell
                      here for consistency.
                    </p>
                  </div>
                )}
              </section>
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-7">
                <div className="flex items-center gap-4">
                  {profile.host.avatarUrl ? (
                    <Image
                      src={profile.host.avatarUrl}
                      alt={displayName}
                      width={72}
                      height={72}
                      unoptimized
                      className="h-18 w-18 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-zinc-900 text-2xl font-semibold text-white">
                      {initials(displayName)}
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ff385c]">
                      Profile card
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                      {displayName}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">{joinedText}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-zinc-700">
                      {profile.host.identityVerified !== false
                        ? "Identity verified"
                        : "Identity not verified"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
                    <BadgeCheck className="h-4 w-4 text-[#ff385c]" />
                    <span className="text-sm text-zinc-700">
                      {getBadgeLabel(profile)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
                    <MessageSquare className="h-4 w-4 text-zinc-600" />
                    <span className="text-sm text-zinc-700">
                      {ratingLabel(rating)} average rating
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                      Reviews
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-950">
                      {formatCompactNumber(reviewsCount)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                      Listings
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-950">
                      {formatCompactNumber(listingsCount)}
                    </p>
                  </div>
                </div>

                <SendMessageButton otherUserId={profile.host.keycloakUserId ?? id} />

                <p className="mt-4 text-center text-xs leading-6 text-zinc-500">
                  This button is visual only for now. The page layout is ready
                  for a messaging flow once the backend endpoint exists.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    );
  } catch {
    return notFound();
  }
}
