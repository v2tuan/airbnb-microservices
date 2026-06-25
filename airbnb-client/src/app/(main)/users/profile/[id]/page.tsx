import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Globe,
  Home,
  MessageSquare,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { type PublicProfilePageData, userAPI } from "@/api/endpoints/user";
import SendMessageButton from "@/components/messages/SendMessageButton";

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

  return `Joined ${date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })}`;
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
    return `${displayName} is an experienced host with a strong track record on Airbnb. Guests can expect consistent stays, clear communication, and a profile backed by verified activity.`;
  }

  return `${displayName} is an active Airbnb member. This public profile shows their host details, reviews, and listings that are available from the backend.`;
}

function getBadgeLabel(profile: PublicProfilePageData) {
  return profile.host?.isSuperhost ? "Superhost" : "Airbnb member";
}

function renderStars(rating?: number) {
  const value = typeof rating === "number" ? rating : 0;

  return [1, 2, 3, 4, 5].map((star) => (
    <Star
      key={star}
      className={star <= Math.round(value) ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"}
    />
  ));
}

function ProfileStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] border border-[#ebebeb] bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
        <Icon className="h-4 w-4 text-[#ff385c]" />
        <span>{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[#222222]">{value}</p>
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
      <h2 className="text-[22px] font-semibold tracking-tight text-[#222222] sm:text-[26px]">
        {title}
      </h2>
      {subtitle ? <p className="max-w-3xl text-sm leading-6 text-zinc-500">{subtitle}</p> : null}
    </div>
  );
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
      <main className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 lg:px-10">
          <section className="border-b border-[#ebebeb] pb-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-5">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-[#ebebeb] bg-[#f7f7f7]">
                  {profile.host.avatarUrl ? (
                    <Image
                      src={profile.host.avatarUrl}
                      alt={displayName}
                      width={96}
                      height={96}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-semibold text-[#222222]">
                      {initials(displayName)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff385c]">
                    Public profile
                  </p>
                  <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-[#222222] sm:text-[36px]">
                    {displayName}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#ff385c]" />
                      {joinedText}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#ff385c]" />
                      {getBadgeLabel(profile)}
                    </span>
                    {profile.host.identityVerified !== false ? (
                      <span className="inline-flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-emerald-600" />
                        Identity verified
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <SendMessageButton otherUserId={profile.host.keycloakUserId ?? id} />
              </div>
            </div>
          </section>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-8">
              <section className="border-b border-[#ebebeb] pb-8">
                <div className="grid gap-4 sm:grid-cols-3">
                  <ProfileStat
                    icon={Star}
                    label="Rating"
                    value={ratingLabel(rating)}
                  />
                  <ProfileStat
                    icon={MessageSquare}
                    label="Reviews"
                    value={formatCompactNumber(reviewsCount)}
                  />
                  <ProfileStat
                    icon={Home}
                    label="Listings"
                    value={formatCompactNumber(listingsCount)}
                  />
                </div>
              </section>

              <section className="border-b border-[#ebebeb] pb-8">
                <SectionHeading
                  eyebrow="About"
                  title="Profile overview"
                  subtitle="A concise public profile that shows host identity, activity, reviews, and listings without extra decoration."
                />

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[16px] border border-[#ebebeb] bg-[#f7f7f7] p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#222222]">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Identity
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-600">
                      {profile.host.identityVerified !== false
                        ? "Identity verification is marked as complete."
                        : "Identity verification is not marked as complete yet."}
                    </p>
                  </div>

                  <div className="rounded-[16px] border border-[#ebebeb] bg-[#f7f7f7] p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#222222]">
                      <Globe className="h-4 w-4 text-[#ff385c]" />
                      Community
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-600">
                      {aboutText}
                    </p>
                  </div>
                </div>
              </section>

              <section className="border-b border-[#ebebeb] pb-8">
                <SectionHeading
                  eyebrow="Reviews"
                  title="Guest feedback"
                  subtitle="Written reviews and ratings from past stays."
                />

                {reviews.length > 0 ? (
                  <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {reviews.map((review, index) => (
                      <article
                        key={
                          review.id ??
                          review.listingId ??
                          review.createdAt ??
                          review.comment ??
                          `review-${index}`
                        }
                        className="rounded-[16px] border border-[#ebebeb] bg-white p-5"
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
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#222222] text-sm font-semibold text-white">
                              {initials(review.reviewerName)}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-medium text-[#222222]">
                                {review.reviewerName || "Guest"}
                              </span>
                              <span className="text-zinc-400">·</span>
                              <span className="text-zinc-500">
                                {formatDateLabel(review.createdAt)}
                              </span>
                            </div>

                            <div className="mt-2 flex items-center gap-1 rounded-full bg-[#f7f7f7] px-3 py-1 text-sm font-medium text-[#222222]">
                              {renderStars(review.rating)}
                              <span className="ml-1 text-zinc-500">
                                {ratingLabel(review.rating)}
                              </span>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-zinc-700">
                              {review.comment || "This guest left a rating without written comments."}
                            </p>

                            {review.listingId ? (
                              <Link
                                href={listingHref(review.listingId)}
                                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#222222] underline underline-offset-4 transition hover:text-[#ff385c]"
                              >
                                View stay
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[16px] border border-dashed border-[#dddddd] bg-[#f7f7f7] px-6 py-10 text-center">
                    <p className="text-base font-medium text-[#222222]">No reviews yet</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      Once ratings are available for this profile, they will appear here.
                    </p>
                  </div>
                )}
              </section>

              <section className="pb-2">
                <SectionHeading
                  eyebrow="Listings"
                  title="Places hosted by this user"
                  subtitle="Active listings from the backend."
                />

                {listings.length > 0 ? (
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {listings.map((listing, index) => (
                      <article
                        key={listing.id ?? listing.title ?? listing.city ?? `listing-${index}`}
                        className="overflow-hidden rounded-[16px] border border-[#ebebeb] bg-white"
                      >
                        <div className="aspect-[4/3] bg-[#f7f7f7]">
                          {listing.thumbnailUrl ? (
                            <Image
                              src={listing.thumbnailUrl}
                              alt={listing.title ?? "Listing"}
                              width={800}
                              height={600}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#ff385c]">
                              <Home className="h-8 w-8" />
                            </div>
                          )}
                        </div>

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-semibold text-[#222222]">
                                {listing.title || "Untitled listing"}
                              </h3>
                              <p className="mt-1 text-sm text-zinc-500">
                                {listing.city || "Location not set"}
                              </p>
                            </div>

                            <div className="inline-flex items-center gap-1 rounded-full border border-[#ebebeb] px-3 py-1 text-xs font-medium text-[#222222]">
                              <Star className="h-3.5 w-3.5 fill-current text-[#ff385c]" />
                              {ratingLabel(listing.avgRating)}
                            </div>
                          </div>

                          <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-600">
                            {listing.shortFeatures ||
                              "Listing details will appear once the backend provides features and amenities."}
                          </p>

                          <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                            <span>{formatNumber(listing.reviewCount)} reviews</span>
                            <Link
                              href={`/rooms/${listing.id}`}
                              className="inline-flex items-center gap-1 font-medium text-[#222222] underline-offset-4 transition hover:text-[#ff385c] hover:underline"
                            >
                              View listing
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[16px] border border-dashed border-[#dddddd] bg-[#f7f7f7] px-6 py-10 text-center">
                    <p className="text-base font-medium text-[#222222]">No listings yet</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">
                      This profile has no active listings published at the moment.
                    </p>
                  </div>
                )}
              </section>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-[20px] border border-[#ebebeb] bg-white p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] bg-[#f7f7f7]">
                    {profile.host.avatarUrl ? (
                      <Image
                        src={profile.host.avatarUrl}
                        alt={displayName}
                        width={64}
                        height={64}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-semibold text-[#222222]">
                        {initials(displayName)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff385c]">
                      Profile card
                    </p>
                    <h3 className="mt-1 truncate text-xl font-semibold tracking-tight text-[#222222]">
                      {displayName}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">{joinedText}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-[16px] bg-[#f7f7f7] px-4 py-3">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-[#222222]">
                      {profile.host.identityVerified !== false
                        ? "Identity verified"
                        : "Identity not verified"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-[16px] bg-[#f7f7f7] px-4 py-3">
                    <BadgeCheck className="h-4 w-4 text-[#ff385c]" />
                    <span className="text-sm text-[#222222]">
                      {getBadgeLabel(profile)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-[16px] bg-[#f7f7f7] px-4 py-3">
                    <MessageSquare className="h-4 w-4 text-zinc-600" />
                    <span className="text-sm text-[#222222]">
                      {ratingLabel(rating)} average rating
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-[16px] border border-[#ebebeb] bg-[#f7f7f7] p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                      Reviews
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#222222]">
                      {formatCompactNumber(reviewsCount)}
                    </p>
                  </div>

                  <div className="rounded-[16px] border border-[#ebebeb] bg-[#f7f7f7] p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                      Listings
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#222222]">
                      {formatCompactNumber(listingsCount)}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <SendMessageButton otherUserId={profile.host.keycloakUserId ?? id} />
                </div>

                <p className="mt-4 text-center text-xs leading-6 text-zinc-500">
                  This profile stays compact and consistent with the rest of the Airbnb-style UI.
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
