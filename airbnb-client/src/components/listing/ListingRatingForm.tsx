"use client";

import { isAxiosError } from "axios";
import { Image as ImageIcon, Loader2, Star, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ratingAPI } from "@/api/endpoints/rating";
import { uploadAPI } from "@/api/endpoints/upload";
import { Button } from "@/components/ui/button";
import { authStorage } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import {
  type RatingCategoryKey,
  ratingCategoryConfig,
} from "./ratingCategories";

const MAX_REVIEW_PHOTOS = 5;
const MAX_REVIEW_PHOTO_SIZE = 5 * 1024 * 1024;
const REVIEW_PHOTO_FOLDER = "airbnb/reviews/photos";
const ALLOWED_REVIEW_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
        isActive ? "text-amber-400" : "text-zinc-300 hover:text-amber-300",
      )}
      aria-label={`Choose ${value} star${value > 1 ? "s" : ""}`}
    >
      <Star className={cn("h-5 w-5", isActive && "fill-current")} />
    </button>
  );
}

export function ListingRatingForm({ bookingId }: { bookingId?: string }) {
  const router = useRouter();
  const [overallRating, setOverallRating] = useState(5);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<ReviewPhotoDraft[]>([]);
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

  const handlePhotoUpload = async (files?: FileList | null) => {
    setError(null);
    setSuccess(null);

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
        const imageUrl = response.data.data.url;
        uploadedPhotos.push({
          imageUrl,
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

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!authStorage.getAccessToken()) {
      setError("Please sign in before submitting a review.");
      return;
    }

    if (!bookingId) {
      setError("Reviews can only be submitted from a completed trip.");
      return;
    }

    if (!canSubmit) {
      setError("Review content should be at least 10 characters.");
      return;
    }

    try {
      setLoading(true);
      await ratingAPI.createRating({
        bookingId,
        overallRating,
        cleanliness: scores.cleanliness,
        accuracy: scores.accuracy,
        checkIn: scores.checkIn,
        communication: scores.communication,
        location: scores.location,
        value: scores.value,
        review: review.trim(),
        photos: photos.map((photo, index) => ({
          imageUrl: photo.imageUrl,
          publicId: photo.publicId ?? undefined,
          sortOrder: index,
        })),
      });

      setSuccess("Your review has been submitted.");
      setReview("");
      setPhotos([]);
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
    } catch (submitError: unknown) {
      setError(getRequestErrorMessage(submitError, "Failed to submit review."));
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
          <p className="block text-sm font-medium text-zinc-800">
            Overall rating
          </p>
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
              <div
                key={category.key}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <Icon className="h-4 w-4 text-[#ff385c]" />
                  <span>{category.label}</span>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, idx) => idx + 1).map(
                    (value) => (
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
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <label
            htmlFor="room-review"
            className="block text-sm font-medium text-zinc-800"
          >
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

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <label
                htmlFor="room-review-photos"
                className="block text-sm font-medium text-zinc-800"
              >
                Photos
              </label>
              <p className="mt-1 text-xs text-zinc-500">
                Add up to {MAX_REVIEW_PHOTOS} JPG, PNG, or WebP photos.
              </p>
            </div>
            <label
              htmlFor="room-review-photos"
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-500",
                (uploadingPhotos || photos.length >= MAX_REVIEW_PHOTOS) &&
                  "pointer-events-none cursor-not-allowed opacity-50",
              )}
            >
              {uploadingPhotos ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploadingPhotos ? "Uploading" : "Add photos"}
            </label>
            <input
              id="room-review-photos"
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
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {photos.map((photo, index) => (
                <div
                  key={photo.imageUrl}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100"
                >
                  <Image
                    src={photo.imageUrl}
                    alt={`Stay upload ${index + 1}`}
                    fill
                    sizes="120px"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.imageUrl)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow-sm transition hover:bg-white"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              <ImageIcon className="h-4 w-4" />
              <span>No photos attached.</span>
            </div>
          )}
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <Button
          type="submit"
          disabled={loading || uploadingPhotos || !canSubmit}
          className="bg-zinc-900 text-white hover:bg-zinc-800"
        >
          {loading
            ? "Submitting..."
            : uploadingPhotos
              ? "Uploading photos..."
              : "Submit review"}
        </Button>
      </form>
    </section>
  );
}
