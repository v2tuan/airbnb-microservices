"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ListingResponse } from "@/api/endpoints/listing";
import { formatPrice } from "@/contants";

declare global {
  interface Window {
    google?: {
      maps: {
        LatLng: new (lat: number, lng: number) => unknown;
        LatLngBounds: new () => {
          extend: (position: { lat: number; lng: number }) => void;
        };
        Map: new (
          element: HTMLElement,
          options: Record<string, unknown>,
        ) => {
          fitBounds: (
            bounds: unknown,
            padding?:
              | number
              | { bottom: number; left: number; right: number; top: number },
          ) => void;
          setCenter: (position: { lat: number; lng: number }) => void;
          setZoom: (zoom: number) => void;
        };
        OverlayView: new () => {
          draw: () => void;
          getPanes: () => { overlayMouseTarget: HTMLElement } | null;
          getProjection: () => {
            fromLatLngToDivPixel: (position: unknown) => {
              x: number;
              y: number;
            };
          };
          onAdd: () => void;
          onRemove: () => void;
          setMap: (map: unknown | null) => void;
        };
      };
    };
    googleMapsPromise?: Promise<void>;
  }
}

interface SearchMapProps {
  destination: string;
  listings: ListingResponse[];
}

const cityCenters: Record<string, { lat: number; lng: number; zoom: number }> =
  {
    "da nang": { lat: 16.0471, lng: 108.2068, zoom: 12 },
    dalat: { lat: 11.9404, lng: 108.4583, zoom: 12 },
    hanoi: { lat: 21.0278, lng: 105.8342, zoom: 12 },
    "ho chi minh": { lat: 10.8231, lng: 106.6297, zoom: 12 },
    vietnam: { lat: 16.1667, lng: 107.8333, zoom: 5 },
  };

const fallbackImage =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=600&auto=format&fit=crop";

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function getFallbackCenter(destination: string) {
  return cityCenters[destination.trim().toLowerCase()] ?? cityCenters.vietnam;
}

function centerMapByDestination(
  map: {
    setCenter: (position: { lat: number; lng: number }) => void;
    setZoom: (zoom: number) => void;
  },
  destination: string,
  fallback: { lat: number; lng: number; zoom: number },
  shouldIgnoreResult: () => boolean,
) {
  const keyword = destination.trim();

  if (!keyword || keyword.toLowerCase() === "nearby") {
    map.setCenter({ lat: fallback.lat, lng: fallback.lng });
    map.setZoom(fallback.zoom);
    return;
  }

  const googleMaps = window.google?.maps as any;

  if (!googleMaps?.Geocoder) {
    map.setCenter({ lat: fallback.lat, lng: fallback.lng });
    map.setZoom(fallback.zoom);
    return;
  }

  const geocoder = new googleMaps.Geocoder();

  geocoder.geocode(
    { address: keyword },
    (
      results: Array<{
        geometry?: { location?: { lat: () => number; lng: () => number } };
      }> | null,
      status: string,
    ) => {
      const location = results?.[0]?.geometry?.location;

      if (shouldIgnoreResult() || status !== "OK" || !location) {
        map.setCenter({ lat: fallback.lat, lng: fallback.lng });
        map.setZoom(fallback.zoom);
        return;
      }

      map.setCenter({ lat: location.lat(), lng: location.lng() });
      map.setZoom(9);
    },
  );
}

function getListingPosition(listing: ListingResponse) {
  if (
    !Number.isFinite(listing.latitude) ||
    !Number.isFinite(listing.longitude)
  ) {
    return null;
  }

  return {
    lat: listing.latitude,
    lng: listing.longitude,
  };
}

function loadGoogleMaps() {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (window.googleMapsPromise) {
    return window.googleMapsPromise;
  }

  window.googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return window.googleMapsPromise;
}

function resolveCoverImage(listing: ListingResponse) {
  return (
    listing.photos?.find((photo) => photo.isCover)?.photoUrl ??
    listing.photos?.[0]?.photoUrl ??
    fallbackImage
  );
}

function resolveRating(listingId: string) {
  const seed = listingId
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return (4.65 + (seed % 31) / 100).toFixed(2);
}

function createPriceOverlay({
  active,
  currency,
  listingId,
  map,
  onSelect,
  position,
  price,
}: {
  active: boolean;
  currency: string;
  listingId: string;
  map: unknown;
  onSelect: (listingId: string) => void;
  position: { lat: number; lng: number };
  price: number;
}) {
  if (!window.google?.maps) return null;

  const overlay = new window.google.maps.OverlayView();
  let container: HTMLButtonElement | null = null;
  const latLng = new window.google.maps.LatLng(position.lat, position.lng);

  const updateClassName = () => {
    if (!container) return;

    container.className = `absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-sm font-bold shadow-lg ring-2 ring-white transition hover:scale-105 ${
      active
        ? "z-30 bg-white text-neutral-950"
        : "z-20 bg-neutral-950 text-white"
    }`;
  };

  overlay.onAdd = () => {
    container = document.createElement("button");
    container.type = "button";
    container.textContent = formatPrice(price, currency);
    updateClassName();
    container.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect(listingId);
    });
    overlay.getPanes()?.overlayMouseTarget.appendChild(container);
  };

  overlay.draw = () => {
    if (!container) return;

    const pixel = overlay.getProjection().fromLatLngToDivPixel(latLng);
    container.style.left = `${pixel.x}px`;
    container.style.top = `${pixel.y}px`;
    updateClassName();
  };

  overlay.onRemove = () => {
    container?.remove();
    container = null;
  };

  overlay.setMap(map);

  return overlay;
}

export default function SearchMap({ destination, listings }: SearchMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<{
    fitBounds: (
      bounds: unknown,
      padding?:
        | number
        | { bottom: number; left: number; right: number; top: number },
    ) => void;
    setCenter: (position: { lat: number; lng: number }) => void;
    setZoom: (zoom: number) => void;
  } | null>(null);
  const boundsKeyRef = useRef("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    null,
  );

  const mapListings = useMemo(
    () =>
      listings
        .map((listing) => ({
          listing,
          position: getListingPosition(listing),
        }))
        .filter(
          (
            item,
          ): item is {
            listing: ListingResponse;
            position: { lat: number; lng: number };
          } => item.position !== null,
        ),
    [listings],
  );

  const selectedListing = useMemo(
    () =>
      listings.find((listing) => listing.listingId === selectedListingId) ??
      null,
    [listings, selectedListingId],
  );

  useEffect(() => {
    if (!googleMapsApiKey || !mapRef.current) return;

    let overlays: Array<{ setMap: (map: unknown | null) => void }> = [];
    let cancelled = false;
    const boundsKey = `${destination}:${mapListings
      .map(
        ({ listing, position }) =>
          `${listing.listingId}:${position.lat}:${position.lng}`,
      )
      .join("|")}`;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current || !window.google?.maps) return;

        const fallback = getFallbackCenter(destination);

        if (!googleMapRef.current) {
          googleMapRef.current = new window.google.maps.Map(mapRef.current, {
            center: { lat: fallback.lat, lng: fallback.lng },
            clickableIcons: false,
            disableDefaultUI: true,
            fullscreenControl: true,
            gestureHandling: "greedy",
            mapTypeControl: false,
            streetViewControl: false,
            styles: [
              {
                featureType: "poi",
                stylers: [{ visibility: "off" }],
              },
            ],
            zoom: fallback.zoom,
            zoomControl: true,
          });
        }

        const map = googleMapRef.current;

        if (boundsKeyRef.current !== boundsKey) {
          boundsKeyRef.current = boundsKey;

          if (mapListings.length > 0) {
            const bounds = new window.google.maps.LatLngBounds();

            mapListings.forEach(({ position }) => {
              bounds.extend(position);
            });
            map.fitBounds(bounds, {
              bottom: 80,
              left: 80,
              right: 80,
              top: 80,
            });
          } else {
            centerMapByDestination(
              map,
              destination,
              fallback,
              () => cancelled,
            );
          }
        }

        overlays = mapListings
          .map(({ listing, position }) =>
            createPriceOverlay({
              active: listing.listingId === selectedListingId,
              currency: listing.pricing?.currency ?? "USD",
              listingId: listing.listingId,
              map,
              onSelect: setSelectedListingId,
              position,
              price: listing.pricing?.basePrice ?? 0,
            }),
          )
          .filter(Boolean) as Array<{ setMap: (map: unknown | null) => void }>;

        const selectedMapItem = mapListings.find(
          ({ listing }) => listing.listingId === selectedListingId,
        );

        if (selectedMapItem) {
          map.setCenter(selectedMapItem.position);
          map.setZoom(16);
        }
      })
      .catch(() => setLoadFailed(true));

    return () => {
      cancelled = true;
      overlays.forEach((overlay) => {
        overlay.setMap(null);
      });
    };
  }, [destination, mapListings, selectedListingId]);

  if (!googleMapsApiKey || loadFailed) {
    const query = encodeURIComponent(destination || "Vietnam");

    return (
      <div className="relative h-full w-full overflow-hidden">
        <iframe
          title="Google Map"
          src={`https://www.google.com/maps?q=${query}&output=embed`}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="absolute left-4 top-4 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-neutral-800 shadow-md">
          Add <span className="font-bold">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span>{" "}
          to show price pins.
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />

      {selectedListing ? (
        <div className="absolute bottom-5 left-1/2 z-40 w-[min(340px,calc(100%-32px))] -translate-x-1/2">
          <div className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10 transition">
            <div className="grid grid-cols-[124px_1fr]">
              <div className="relative min-h-32 bg-neutral-100">
                <Image
                  src={resolveCoverImage(selectedListing)}
                  alt={selectedListing.title}
                  fill
                  className="object-cover"
                  sizes="124px"
                />
              </div>
              <div className="min-w-0 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-bold text-neutral-950">
                    {selectedListing.city}, {selectedListing.country}
                  </p>
                  <span className="shrink-0 text-xs font-semibold text-neutral-950">
                    ★ {resolveRating(selectedListing.listingId)}
                  </span>
                </div>
                <Link
                  href={`/rooms/${selectedListing.listingId}`}
                  className="mt-1 block line-clamp-2 text-sm font-semibold text-neutral-900 underline-offset-2 hover:underline"
                >
                  {selectedListing.title}
                </Link>
                <p className="mt-2 text-sm text-neutral-500">
                  {selectedListing.maxGuests} guests · {selectedListing.numBeds}{" "}
                  beds
                </p>
                <p className="mt-3 text-sm text-neutral-950">
                  <span className="font-bold">
                    {formatPrice(
                      selectedListing.pricing?.basePrice ?? 0,
                      selectedListing.pricing?.currency ?? "USD",
                    )}
                  </span>{" "}
                  night
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedListingId(null)}
            className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full bg-white text-sm font-bold text-neutral-900 shadow-lg ring-1 ring-black/10"
            aria-label="Close listing preview"
          >
            x
          </button>
        </div>
      ) : null}
    </div>
  );
}
