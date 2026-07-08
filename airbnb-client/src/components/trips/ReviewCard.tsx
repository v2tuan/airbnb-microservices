"use client";

import { isAxiosError } from "axios";
import {
  Check,
  Image as ImageIcon,
  Loader2,
  Star,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { ratingAPI } from "@/api/endpoints/rating";
import { uploadAPI } from "@/api/endpoints/upload";
import { authStorage } from "@/lib/auth-storage";

const MAX_REVIEW_PHOTOS = 5;
const MAX_REVIEW_PHOTO_SIZE = 5 * 1024 * 1024;
const REVIEW_PHOTO_FOLDER = "airbnb/reviews/photos";
const ALLOWED_REVIEW_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface ReviewCardProps {
  hostName: string;
  bookingId?: string;
  onSubmitted?: () => void;
}

type ReviewPhotoDraft = {
  imageUrl: string;
  publicId?: string | null;
  sortOrder: number;
};

function getRequestErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function isAlreadyReviewedError(error: unknown) {
  if (!isAxiosError<{ message?: string }>(error)) {
    return false;
  }

  const responseText = JSON.stringify(error.response?.data ?? {}).toLowerCase();

  return (
    error.response?.status === 409 &&
    responseText.includes("already been reviewed")
  );
}

export function ReviewCard({
  hostName,
  bookingId,
  onSubmitted,
}: ReviewCardProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [review, setReview] = useState("");
  const [photos, setPhotos] = useState<ReviewPhotoDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [checkingExistingReview, setCheckingExistingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    rating > 0 &&
    review.trim().length >= 10 &&
    !submitting &&
    !uploadingPhotos &&
    !checkingExistingReview;

  useEffect(() => {
    if (!bookingId) {
      setSubmitted(false);
      setCheckingExistingReview(false);
      return;
    }

    let cancelled = false;
    setSubmitted(false);
    setError(null);
    setCheckingExistingReview(true);

    ratingAPI
      .getRatingByBooking(bookingId)
      .then(() => {
        if (!cancelled) {
          setSubmitted(true);
        }
      })
      .catch((lookupError: unknown) => {
        if (isAxiosError(lookupError) && lookupError.response?.status === 404) {
          return;
        }
        if (!cancelled) {
          setError(
            getRequestErrorMessage(
              lookupError,
              "Unable to check review status.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingExistingReview(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const handlePhotoUpload = async (files?: FileList | null) => {
    setError(null);

    if (!files?.length) {
      return;
    }

    const nextFiles = Array.from(files);
    if (photos.length + nextFiles.length > MAX_REVIEW_PHOTOS) {
      setError(`You can attach up to ${MAX_REVIEW_PHOTOS} photos.`);
      return;
    }

    const invalidFile = nextFiles.find(
      (file) =>
        !ALLOWED_REVIEW_PHOTO_TYPES.has(file.type) ||
        file.size > MAX_REVIEW_PHOTO_SIZE,
    );
    if (invalidFile) {
      setError("Photos must be JPG, PNG, or WebP and no larger than 5MB each.");
      return;
    }

    try {
      setUploadingPhotos(true);
      const token = authStorage.getAccessToken();
      const uploadedPhotos: ReviewPhotoDraft[] = [];

      for (const file of nextFiles) {
        const response = await uploadAPI.uploadImage(
          token,
          file,
          REVIEW_PHOTO_FOLDER,
        );
        uploadedPhotos.push({
          imageUrl: response.data.data.url,
          publicId: response.data.data.publicId,
          sortOrder: photos.length + uploadedPhotos.length,
        });
      }

      setPhotos((current) => [
        ...current,
        ...uploadedPhotos.map((photo, index) => ({
          ...photo,
          sortOrder: current.length + index,
        })),
      ]);
    } catch (uploadError: unknown) {
      setError(
        getRequestErrorMessage(uploadError, "Unable to upload review photos."),
      );
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (imageUrl: string) => {
    setPhotos((current) =>
      current
        .filter((photo) => photo.imageUrl !== imageUrl)
        .map((photo, index) => ({ ...photo, sortOrder: index })),
    );
  };

  const submitReview = async () => {
    setError(null);

    if (!authStorage.getAccessToken()) {
      setError("Please sign in before submitting a review.");
      return;
    }

    if (!bookingId) {
      setError("Booking information is missing for this review.");
      return;
    }

    if (!canSubmit) {
      setError("Choose a rating and write at least 10 characters.");
      return;
    }

    try {
      setSubmitting(true);
      await ratingAPI.createRating({
        bookingId,
        overallRating: rating,
        cleanliness: rating,
        accuracy: rating,
        checkIn: rating,
        communication: rating,
        location: rating,
        value: rating,
        review: review.trim(),
        photos: photos.map((photo, index) => ({
          imageUrl: photo.imageUrl,
          publicId: photo.publicId ?? undefined,
          sortOrder: index,
        })),
      });

      setSubmitted(true);
      onSubmitted?.();
    } catch (submitError: unknown) {
      if (isAlreadyReviewedError(submitError)) {
        setSubmitted(true);
        onSubmitted?.();
        return;
      }

      setError(getRequestErrorMessage(submitError, "Failed to submit review."));
    } finally {
      setSubmitting(false);
    }
  };

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

  if (checkingExistingReview) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking review status...</span>
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
        <>
          <textarea
            value={review}
            onChange={(event) => setReview(event.target.value)}
            placeholder="Share your experience with future guests..."
            className="mb-4 h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 transition-all focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
          />

          <div className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ImageIcon className="h-4 w-4" />
                Photos
              </div>
              <label
                htmlFor="trip-review-photos"
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 ${
                  uploadingPhotos || photos.length >= MAX_REVIEW_PHOTOS
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                {uploadingPhotos ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {uploadingPhotos ? "Uploading" : "Add"}
              </label>
              <input
                id="trip-review-photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                disabled={uploadingPhotos || photos.length >= MAX_REVIEW_PHOTOS}
                onChange={(event) => {
                  void handlePhotoUpload(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>

            {photos.length > 0 ? (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {photos.map((photo, index) => (
                  <div
                    key={photo.imageUrl}
                    className="relative aspect-square overflow-hidden rounded-lg bg-slate-100"
                  >
                    <Image
                      src={photo.imageUrl}
                      alt={`Stay upload ${index + 1}`}
                      fill
                      sizes="80px"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.imageUrl)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm hover:bg-white"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      <button
        type="button"
        disabled={!canSubmit || checkingExistingReview}
        onClick={() => void submitReview()}
        className="w-full rounded-xl bg-rose-500 py-3 text-sm font-medium text-white transition-all hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {checkingExistingReview
          ? "Checking review..."
          : submitting
            ? "Submitting..."
            : uploadingPhotos
              ? "Uploading photos..."
              : "Submit review"}
      </button>
    </div>
  );
}
