import Link from "next/link";
import { Star } from "lucide-react";

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

interface RatingCategory {
  key: string;
  label: string;
  description: string;
}

const ratingCategories: RatingCategory[] = [
  {
    key: "cleanliness",
    label: "Cleanliness",
    description: "",
  },
  {
    key: "accuracy",
    label: "Accuracy",
    description: "",
  },
  {
    key: "checkIn",
    label: "Check-in",
    description: "",
  },
  {
    key: "communication",
    label: "Communication",
    description: "",
  },
  {
    key: "location",
    label: "Location",
    description: "",
  },
  {
    key: "value",
    label: "Value",
    description: "",
  },
];

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
  const hasRating = averageRating > 0;
  const totalReviews = ratings.length;
  const previewReviews = ratings
    .filter((rating) => typeof rating.review === "string" && rating.review.trim().length > 0)
    .slice(0, 8);
  const displayCategories = ratingCategories.map((category) => ({
    ...category,
    score: getAverage(ratings, category.key as keyof RatingRecord),
  }));

  return (
    <section className="mt-12 space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-zinc-900">
          <Star className="h-7 w-7 fill-current" />
          <h2 className="text-5xl font-semibold leading-none">
            {hasRating ? formatRating(averageRating) : "--"}
          </h2>
        </div>
        <p className="mt-2 text-zinc-500">Guest favorite</p>
        <p className="text-sm text-zinc-400">
          Based on {totalReviews} review{totalReviews === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3 lg:grid-cols-6">
        {displayCategories.map((category) => {
          const score = category.score;
          return (
            <div key={category.key} className="text-center">
              <p className="font-medium text-zinc-900">{category.label}</p>
              <p className="text-zinc-500">{score > 0 ? formatRating(score) : "--"}</p>
            </div>
          );
        })}
      </div>

      {previewReviews.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {previewReviews.map((rating, index) => {
            const displayDate = toDisplayDate(rating.createdAt);
            return (
              <article key={rating.id ?? `${rating.userId}-${index}`} className="space-y-3">
                <div className="flex items-center gap-3">
                  {rating.reviewerAvatarUrl ? (
                    <img
                      src={rating.reviewerAvatarUrl}
                      alt={toGuestLabel(rating)}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                      {toAvatarText(rating)}
                    </div>
                  )}

                  <div>
                    {rating.userId ? (
                      <Link
                        href={`/users/profile/${rating.userId}`}
                        className="font-medium text-zinc-900 hover:underline transition"
                      >
                        {toGuestLabel(rating)}
                      </Link>
                    ) : (
                      <p className="font-medium text-zinc-900">{toGuestLabel(rating)}</p>
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

                <p className="text-sm leading-6 text-zinc-700 line-clamp-4">
                  {rating.review}
                </p>

                <details className="group">
                  <summary className="cursor-pointer text-sm underline list-none text-zinc-700">
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
        <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
          No reviews yet. Be the first guest to leave feedback.
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500">
        This section only uses fields currently returned by rating service:
        overallRating, cleanliness, accuracy, checkIn, communication, location, value, review, userId, reviewerFullName, reviewerAvatarUrl, and optional createdAt.
      </div>
    </section>
  );
}