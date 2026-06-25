"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Camera, Images } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type ListingPhoto = {
  photoUrl?: string;
  caption?: string;
  isCover?: boolean;
};

export function ListingGallery({ photos = [], title = "House photos" }: { photos?: ListingPhoto[]; title?: string }) {
  const [erroredMap, setErroredMap] = useState<Record<string, boolean>>({});

  const SafeImage = ({
    src,
    alt,
    className,
    sizes,
    priority,
    unoptimized,
  }: {
    src: string;
    alt?: string;
    className?: string;
    sizes?: string;
    priority?: boolean;
    unoptimized?: boolean;
  }) => {
    const hasErrored = !!erroredMap[src];
    const fallback = "/header/home.png"; // public fallback image

    const displaySrc = hasErrored ? fallback : src;

    return (
      <img
        src={displaySrc}
        alt={alt ?? "photo"}
        loading={priority ? "eager" : "lazy"}
        className={`${className ?? ""} h-full w-full object-cover`}
        onError={(e) => {
          // if the displaySrc already fallback, don't infinite loop
          if (!hasErrored) setErroredMap((prev) => ({ ...prev, [src]: true }));
        }}
        style={{ objectFit: "cover" }}
      />
    );
  };

  const normalizedPhotos = useMemo(
    () => photos.filter((photo): photo is ListingPhoto => !!photo?.photoUrl),
    [photos]
  );
  const coverPhoto = normalizedPhotos.find((photo) => photo.isCover) ?? normalizedPhotos[0];
  const previewPhotos = normalizedPhotos.filter((photo) => photo !== coverPhoto).slice(0, 4);
  const isSinglePhoto = normalizedPhotos.length === 1;

  if (!coverPhoto) {
    return (
      <div className="grid aspect-[16/10] place-items-center rounded-[20px] border border-dashed border-[#dddddd] bg-[#f7f7f7] text-zinc-500">
        <div className="text-center">
          <Images className="mx-auto h-6 w-6 text-zinc-400" />
          <p className="mt-2 text-sm font-medium">No photos available yet</p>
        </div>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative w-full overflow-hidden rounded-[20px] border border-[#dddddd] bg-white"
          aria-label="Show all photos"
        >
          {isSinglePhoto ? (
            <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[21/10]">
              <SafeImage
                src={coverPhoto.photoUrl!}
                alt={title}
                sizes="100vw"
                priority
                unoptimized
                className="object-cover transition duration-300 group-hover:scale-[1.02]"
              />

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.16))]" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.78))] p-5 text-white sm:p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">Photos</p>
                  <h3 className="mt-1 text-lg font-semibold sm:text-2xl">Open all photos</h3>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur">
                  <Camera className="h-4 w-4" />
                  {normalizedPhotos.length} photos
                </span>
              </div>
            </div>
          ) : (
            <div className="grid aspect-[16/10] grid-cols-4 grid-rows-2 gap-2 p-2 sm:aspect-[21/10]">
              <div className="relative col-span-2 row-span-2 overflow-hidden rounded-[16px]">
                <SafeImage
                  src={coverPhoto.photoUrl!}
                  alt={title}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition duration-300 group-hover:scale-[1.02]"
                  unoptimized
                />
              </div>

              {previewPhotos.map((photo, index) => (
                <div key={`${photo.photoUrl}-${index}`} className="relative overflow-hidden rounded-[16px]">
                  <SafeImage
                    src={photo.photoUrl!}
                    alt={`${title} photo ${index + 2}`}
                    sizes="(max-width: 1024px) 25vw, 14vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    unoptimized
                  />
                </div>
              ))}

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.68))] p-5 text-white">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/80">Photos</p>
                  <h3 className="mt-1 text-lg font-semibold">Browse {normalizedPhotos.length} photos</h3>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur">
                  <Camera className="h-4 w-4" />
                  Open gallery
                </span>
              </div>
            </div>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl overflow-hidden rounded-[20px] border-0 bg-zinc-950 p-0 text-white shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <p className="text-sm text-white/60">{normalizedPhotos.length} media items</p>
          </div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {normalizedPhotos.map((photo, index) => (
              <div
                key={`${photo.photoUrl}-${index}`}
                className="group relative aspect-4/3 overflow-hidden rounded-[16px] bg-zinc-900/60"
              >
                <SafeImage
                  src={photo.photoUrl!}
                  alt={photo.caption ?? `${title} media ${index + 1}`}
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.2))]" />
                {photo.caption ? (
                  <div className="absolute inset-x-0 bottom-0 p-3 text-xs text-white/90">{photo.caption}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
