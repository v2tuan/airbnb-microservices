"use client";

import { Check, Star } from "lucide-react";
import { useState } from "react";

interface ReviewCardProps {
  hostName: string;
}

export function ReviewCard({ hostName }: ReviewCardProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [review, setReview] = useState("");

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-emerald-800">Review submitted</p>
            <p className="text-sm text-emerald-600">
              Thanks for sharing your experience.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="font-display mb-2 font-semibold text-slate-900">
        How was your stay?
      </h3>
      <p className="mb-5 text-sm text-slate-500">
        Leave a review for <strong>{hostName}</strong> and future guests.
      </p>

      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
            aria-label={`Rate ${star} stars`}
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                star <= (hover || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-200 text-slate-200"
              }`}
            />
          </button>
        ))}
      </div>

      {rating > 0 ? (
        <textarea
          value={review}
          onChange={(event) => setReview(event.target.value)}
          placeholder="Share your experience with future guests..."
          className="mb-4 h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 transition-all focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
        />
      ) : null}

      <button
        type="button"
        disabled={rating === 0}
        onClick={() => rating > 0 && setSubmitted(true)}
        className="w-full rounded-xl bg-rose-500 py-3 text-sm font-medium text-white transition-all hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Submit review
      </button>
    </div>
  );
}
