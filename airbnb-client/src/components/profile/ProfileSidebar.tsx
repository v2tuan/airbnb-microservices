"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeCheck, ChevronLeft, ChevronRight, MessageSquare, ShieldCheck } from "lucide-react";

import type { PublicProfilePageData } from "@/api/endpoints/user";

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

function ratingLabel(value?: number) {
  if (typeof value !== "number") return "0.0";
  return value.toFixed(1);
}

function formatCompactNumber(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function parseRating(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getHostAverageRating(profile: PublicProfilePageData) {
  const fromStats = parseRating(profile.stats?.overallRating);
  if (fromStats > 0) return fromStats;

  const fromHost = parseRating(
    (profile.host as Record<string, unknown> | undefined)?.overallRating ??
      (profile.host as Record<string, unknown> | undefined)?.avgRating ??
      (profile.host as Record<string, unknown> | undefined)?.rating,
  );
  if (fromHost > 0) return fromHost;

  const reviewRatings = (profile.reviews?.items ?? [])
    .map((review) => parseRating(review.rating))
    .filter((value) => value > 0);
  if (reviewRatings.length > 0) {
    return reviewRatings.reduce((sum, value) => sum + value, 0) / reviewRatings.length;
  }

  return 0;
}

export default function ProfileSidebar({
  profile,
  displayName,
  joinedText,
}: {
  profile: PublicProfilePageData;
  displayName: string;
  joinedText: string;
}) {
  const [open, setOpen] = useState(false);
  const rating = getHostAverageRating(profile);
  const reviewsCount =
    profile.stats?.reviewsCount ??
    profile.reviews?.totalElements ??
    profile.reviews?.items?.length ??
    0;
  const listingsCount =
    profile.stats?.activeListingsCount ??
    profile.listings?.totalElements ??
    profile.listings?.items?.length ??
    0;

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div
        className={`overflow-hidden rounded-[20px] border border-[#ebebeb] bg-white transition-all duration-300 ease-out ${
          open ? "w-full max-w-[320px] p-6 shadow-sm" : "w-[72px] p-3 shadow-[0_6px_24px_rgba(15,23,42,0.08)]"
        }`}
      >
        <div className={`flex items-center ${open ? "gap-4" : "justify-center"}`}>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ebebeb] bg-white text-[#222222] transition hover:border-[#ff385c] hover:text-[#ff385c] ${open ? "" : "shadow-sm"}`}
            aria-label={open ? "Collapse profile panel" : "Expand profile panel"}
          >
            {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {open ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] bg-[#f7f7f7]">
                {profile.host?.avatarUrl ? (
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
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f7f7f7] text-sm font-semibold text-[#222222]">
                {initials(displayName)}
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 [writing-mode:vertical-rl] rotate-180">
                Profile
              </span>
            </div>
          )}
        </div>

        {open ? (
          <>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-[16px] bg-[#f7f7f7] px-4 py-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-[#222222]">
                  {profile.host?.identityVerified !== false
                    ? "Identity verified"
                    : "Identity not verified"}
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-[16px] bg-[#f7f7f7] px-4 py-3">
                <BadgeCheck className="h-4 w-4 text-[#ff385c]" />
                <span className="text-sm text-[#222222]">
                  {profile.host?.isSuperhost ? "Superhost" : "Airbnb member"}
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

            <p className="mt-4 text-center text-xs leading-6 text-zinc-500">
              This profile stays compact and consistent with the rest of the Airbnb-style UI.
            </p>
          </>
        ) : null}
      </div>
    </aside>
  );
}
