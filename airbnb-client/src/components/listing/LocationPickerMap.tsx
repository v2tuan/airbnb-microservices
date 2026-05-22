"use client";

import { useEffect, useRef, useState } from "react";

interface LocationPickerMapProps {
  address?: string;
  latitude: number;
  longitude: number;
  onChange: (position: { latitude: number; longitude: number }) => void;
}

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

declare global {
  interface Window {
    googleMapsPromise?: Promise<void>;
  }
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

export default function LocationPickerMap({
  address,
  latitude,
  longitude,
  onChange,
}: LocationPickerMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const lastGeocodedAddressRef = useRef("");
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!googleMapsApiKey || !mapRef.current) return;

    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current || !window.google?.maps) return;

        const googleMaps = window.google.maps as any;
        const center = { lat: latitude, lng: longitude };
        const map = new googleMaps.Map(mapRef.current, {
          center,
          clickableIcons: false,
          fullscreenControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          zoom: 15,
          zoomControl: true,
        });
        const marker = new googleMaps.Marker({
          map,
          position: center,
        });

        map.addListener("click", (event: any) => {
          const nextLatitude = event.latLng.lat();
          const nextLongitude = event.latLng.lng();
          marker.setPosition({ lat: nextLatitude, lng: nextLongitude });
          onChangeRef.current({
            latitude: Number(nextLatitude.toFixed(6)),
            longitude: Number(nextLongitude.toFixed(6)),
          });
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      })
      .catch(() => setLoadFailed(true));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const position = { lat: latitude, lng: longitude };
    mapInstanceRef.current?.setCenter(position);
    markerRef.current?.setPosition(position);
  }, [latitude, longitude]);

  useEffect(() => {
    const query = address?.trim();

    if (!query || query.length < 6 || !window.google?.maps) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (lastGeocodedAddressRef.current === query || !window.google?.maps) {
        return;
      }

      lastGeocodedAddressRef.current = query;
      const geocoder = new (window.google.maps as any).Geocoder();

      geocoder.geocode({ address: query }, (results: any[], status: string) => {
        if (status !== "OK" || !results?.[0]?.geometry?.location) {
          return;
        }

        const location = results[0].geometry.location;
        const nextLatitude = location.lat();
        const nextLongitude = location.lng();
        const position = { lat: nextLatitude, lng: nextLongitude };

        mapInstanceRef.current?.setCenter(position);
        mapInstanceRef.current?.setZoom(16);
        markerRef.current?.setPosition(position);
        onChangeRef.current({
          latitude: Number(nextLatitude.toFixed(6)),
          longitude: Number(nextLongitude.toFixed(6)),
        });
      });
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [address]);

  if (!googleMapsApiKey || loadFailed) {
    return (
      <iframe
        title="Listing location map"
        src={`https://www.google.com/maps?q=${latitude},${longitude}&output=embed`}
        className="h-72 w-full rounded-2xl border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  return (
    <div
      ref={mapRef}
      className="h-72 w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100"
    />
  );
}
