"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";

import { ratingAPI } from "@/api/endpoints/rating";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ratingCategoryConfig, type RatingCategoryKey } from "./ratingCategories";

function readCurrentUserProfile() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const id = typeof parsed?.id === "string" ? parsed.id : null;
    if (!id) {
      return null;
    }

    const fullName =
      typeof parsed?.fullName === "string" && parsed.fullName.trim().length > 0
        ? parsed.fullName.trim()
        : typeof parsed?.name === "string" && parsed.name.trim().length > 0
          ? parsed.name.trim()
          : null;

    const avatarUrl =
      typeof parsed?.avatarUrl === "string" && parsed.avatarUrl.trim().length > 0
        ? parsed.avatarUrl.trim()
        : null;

    return {
      id,
      fullName,
      avatarUrl,
    };
  } catch {
    return null;
  }
}

function StarInput({
  value,
  current,
  onSelect,
}: {
  value: number;
  current: number;
  onSelect: (value: number) => void;
}) {
  const isActive = value <= current;

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "rounded-full p-1 transition hover:scale-110",
        isActive ? "text-amber-400" : "text-zinc-300 hover:text-amber-300"
      )}
      aria-label={`Choose ${value} star${value > 1 ? "s" : ""}`}
    >
      <Star className={cn("h-5 w-5", isActive && "fill-current")} />
    </button>
  );
}

export function ListingRatingForm({
  listingId,
  hostId,
}: {
  listingId: string;
  hostId?: string;
}) {
  const router = useRouter();
  const [overallRating, setOverallRating] = useState(5);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<RatingCategoryKey, number>>({
    cleanliness: 5,
    accuracy: 5,
    checkIn: 5,
    communication: 5,
    location: 5,
    value: 5,
  });

  const canSubmit = useMemo(() => review.trim().length >= 10, [review]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const profile = readCurrentUserProfile();
    if (!profile) {
      setError("Please sign in before submitting a review.");
      return;
    }

    if (!canSubmit) {
      setError("Review content should be at least 10 characters.");
      return;
    }

    try {
      setLoading(true);
      await ratingAPI.createRating({
        listingId,
        userId: profile.id,
        hostId,
        reviewerFullName: profile.fullName ?? undefined,
        reviewerAvatarUrl: profile.avatarUrl ?? undefined,
        overallRating,
        cleanliness: scores.cleanliness,
        accuracy: scores.accuracy,
        checkIn: scores.checkIn,
        communication: scores.communication,
        location: scores.location,
        value: scores.value,
        review: review.trim(),
      });

      setSuccess("Your review has been submitted.");
      setReview("");
      setOverallRating(5);
      setScores({
        cleanliness: 5,
        accuracy: 5,
        checkIn: 5,
        communication: 5,
        location: 5,
        value: 5,
      });

      router.refresh();
    } catch (submitError: any) {
      const message =
        submitError?.response?.data?.message ||
        submitError?.message ||
        "Failed to submit review.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-xl font-semibold text-zinc-900">Rate this stay</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Your feedback goes directly to rating service and updates this page.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-800">Overall rating</label>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }, (_, idx) => idx + 1).map((value) => (
              <StarInput
                key={value}
                value={value}
                current={overallRating}
                onSelect={setOverallRating}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {ratingCategoryConfig.map((category) => {
            const Icon = category.icon;

            return (
              <div key={category.key} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <Icon className="h-4 w-4 text-[#ff385c]" />
                  <span>{category.label}</span>
                </label>
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, idx) => idx + 1).map((value) => (
                    <StarInput
                      key={value}
                      value={value}
                      current={scores[category.key]}
                      onSelect={(nextValue) => {
                        setScores((current) => ({
                          ...current,
                          [category.key]: nextValue,
                        }));
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <label htmlFor="room-review" className="block text-sm font-medium text-zinc-800">
            Review
          </label>
          <textarea
            id="room-review"
            value={review}
            onChange={(event) => setReview(event.target.value)}
            rows={4}
            placeholder="Share details about your stay..."
            className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-zinc-400"
          />
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <Button
          type="submit"
          disabled={loading || !canSubmit}
          className="bg-zinc-900 text-white hover:bg-zinc-800"
        >
          {loading ? "Submitting..." : "Submit review"}
        </Button>
      </form>
    </section>
  );
}
