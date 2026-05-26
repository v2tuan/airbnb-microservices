"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

interface GalleryModalProps {
  images: string[];
  title: string;
  isOpen: boolean;
  initialIndex?: number;
  onClose: () => void;
}

export function GalleryModal({
  images,
  title,
  isOpen,
  initialIndex = 0,
  onClose,
}: GalleryModalProps) {
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) setCurrent(initialIndex);
  }, [initialIndex, isOpen]);

  if (!isOpen || images.length === 0) return null;

  const prev = () =>
    setCurrent((value) => (value - 1 + images.length) % images.length);
  const next = () => setCurrent((value) => (value + 1) % images.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      <div className="relative flex h-full w-full items-center justify-center p-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="Close gallery"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="absolute top-5 left-1/2 -translate-x-1/2 text-sm text-white/60">
          {current + 1} / {images.length}
        </div>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        ) : null}

        <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl">
          <Image
            src={images[current]}
            alt={`${title} - photo ${current + 1}`}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </div>

        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setCurrent(index)}
              className={`h-8 w-12 overflow-hidden rounded-lg ring-2 transition-all ${
                index === current
                  ? "ring-white"
                  : "opacity-60 ring-transparent hover:opacity-80"
              }`}
              aria-label={`Open image ${index + 1}`}
            >
              <Image
                src={image}
                alt=""
                width={48}
                height={32}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
