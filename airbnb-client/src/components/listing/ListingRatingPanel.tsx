import Link from "next/link";
import { MessageSquare, Star } from "lucide-react";

import { ratingCategoryConfig } from "./ratingCategories";

interface RatingRecord {
  id?: string | null;
  userId?: string | null;
  reviewerFullName?: string | null;
  reviewerAvatarUrl?: string | null;
  overallRating?: number | null;
  cleanliness?: number | null;
  accuracy?: number | null;
  checkIn?: number | null;
  communication?: number | null;
  location?: number | null;
  value?: number | null;
  review?: string | null;
  createdAt?: string | null;
}

const formatRating = (value: number) => value.toFixed(1);

const getAverage = (ratings: RatingRecord[], key: keyof RatingRecord) => {
  const values = ratings
    .map((rating) => rating[key])
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const toGuestLabel = (rating: RatingRecord) => {
  if (rating.reviewerFullName && rating.reviewerFullName.trim()) {
    return rating.reviewerFullName.trim();
  }

  if (!rating.userId) {
    return "Guest";
  }

  if (rating.userId.length <= 12) {
    return rating.userId;
  }

  return `${rating.userId.slice(0, 8)}...${rating.userId.slice(-4)}`;
};

const toAvatarText = (rating: RatingRecord) => {
  if (rating.reviewerFullName && rating.reviewerFullName.trim()) {
    return rating.reviewerFullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  if (!rating.userId) {
    return "GU";
  }

  return rating.userId.slice(0, 2).toUpperCase();
};

const toDisplayDate = (createdAt?: string | null) => {
  if (!createdAt) {
    return "";
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

function InlineRatingStars({ value }: { value: number }) {
  const roundedValue = Math.round(value);

  return (
    <div className="flex items-center gap-0.5 text-zinc-900">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${index < roundedValue ? "fill-current" : "text-zinc-300"}`}
        />
      ))}
    </div>
  );
}

export function ListingRatingPanel({
  averageRating,
  ratings,
}: {
  averageRating: number;
  ratings: RatingRecord[];
}) {
  const computedAverage = averageRating > 0 ? averageRating : getAverage(ratings, "overallRating");
  const hasRating = computedAverage > 0;
  const totalReviews = ratings.length;
  const previewReviews = ratings
    .filter((rating) => typeof rating.review === "string" && rating.review.trim().length > 0)
    .slice(0, 8);
  const displayCategories = ratingCategoryConfig.map((category) => ({
    ...category,
    score: getAverage(ratings, category.key as keyof RatingRecord),
  }));

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-5 border-b border-[#ebebeb] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff385c]">
            Reviews
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Star className="h-6 w-6 fill-current text-[#222222]" />
            <h2 className="text-[44px] font-semibold leading-none tracking-tight text-[#222222]">
              {hasRating ? formatRating(computedAverage) : "--"}
            </h2>
          </div>
          <p className="mt-2 text-sm text-zinc-500">Guest favorite</p>
          <p className="text-sm text-zinc-400">
            Based on {totalReviews} review{totalReviews === 1 ? "" : "s"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {displayCategories.map((category) => {
            const score = category.score;
            const Icon = category.icon;
            return (
              <div key={category.key} className="min-w-0 rounded-[14px] border border-[#ebebeb] bg-white px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7f7f7] text-[#222222]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
                    {category.label}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-[#f2f2f2]">
                    <div
                      className="h-1.5 rounded-full bg-[#222222]"
                      style={{ width: `${Math.min(100, Math.round((score / 5) * 100))}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-[#222222]">
                    {score > 0 ? formatRating(score) : "--"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {previewReviews.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {previewReviews.map((rating, index) => {
            const displayDate = toDisplayDate(rating.createdAt);
            return (
              <article key={rating.id ?? `${rating.userId}-${index}`} className="rounded-[16px] border border-[#ebebeb] bg-white p-4">
                <div className="flex items-center gap-3">
                  {rating.reviewerAvatarUrl ? (
                    <img
                      src={rating.reviewerAvatarUrl}
                      alt={toGuestLabel(rating)}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#222222] text-xs font-semibold text-white">
                      {toAvatarText(rating)}
                    </div>
                  )}

                  <div>
                    {rating.userId ? (
                      <Link
                        href={`/users/profile/${rating.userId}`}
                        className="font-medium text-[#222222] hover:underline transition"
                      >
                        {toGuestLabel(rating)}
                      </Link>
                    ) : (
                      <p className="font-medium text-[#222222]">{toGuestLabel(rating)}</p>
                    )}
                    <p className="text-xs text-zinc-400">
                      {displayDate || "Guest review"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <InlineRatingStars value={rating.overallRating ?? 0} />
                  <span className="text-xs text-zinc-500">
                    {(rating.overallRating ?? 0) > 0
                      ? formatRating(rating.overallRating ?? 0)
                      : "--"}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-zinc-700 line-clamp-4">
                  {rating.review}
                </p>

                <details className="group mt-2">
                  <summary className="cursor-pointer list-none text-sm font-medium text-[#222222] underline underline-offset-4">
                    Show more
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">
                    {rating.review}
                  </p>
                </details>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[16px] border border-dashed border-[#dddddd] bg-[#f7f7f7] p-8 text-center text-zinc-500">
          {totalReviews > 0 ? (
            <div className="mx-auto max-w-md space-y-2">
              <div className="flex justify-center">
                <MessageSquare className="h-5 w-5 text-[#ff385c]" />
              </div>
              <p className="text-sm font-medium text-[#222222]">Ratings exist, but there are no written reviews yet.</p>
              <p className="text-sm text-zinc-500">
                The score summary above is still based on guest ratings.
              </p>
            </div>
          ) : (
            <p>No reviews yet. Be the first guest to leave feedback.</p>
          )}
        </div>
      )}
    </section>
  );
}
