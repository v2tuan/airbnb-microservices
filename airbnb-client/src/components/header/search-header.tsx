"use client";

import {
  GlobeIcon,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  selectCurrentUser,
  selectIsAuthenticated,
} from "@/features/auth/authSelectors";
import { hasRealmRole } from "@/lib/jwt";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store";
import Logo from "../logo";
import SearchBar from "./search-bar";
import UserMenu from "./user-menu";

// ─── Compact Search Bar ───────────────────────────────────────────────────────

function CompactSearchBar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 items-center overflow-hidden rounded-full border border-gray-300 bg-white shadow-sm transition hover:shadow-md"
    >
      {/* Anywhere */}
      <div className="relative flex h-full items-center gap-2 px-4">
        <Image
          src="/header/home.png"
          alt="home indicator"
          width={80}
          height={20}
          className="h-auto w-12 object-contain"
        />
        <span className="text-sm font-semibold whitespace-nowrap">
          Anywhere
        </span>
        <div className="absolute right-0 top-1/2 h-6 w-px -translate-y-1/2 bg-gray-300" />
      </div>

      {/* Anytime */}
      <div className="relative flex h-full items-center px-4">
        <span className="text-sm font-semibold whitespace-nowrap">Anytime</span>
        <div className="absolute right-0 top-1/2 h-6 w-px -translate-y-1/2 bg-gray-300" />
      </div>

      {/* Guests */}
      <div className="flex h-full items-center gap-2 pl-4 pr-2">
        <span className="text-sm font-semibold whitespace-nowrap">
          Add guests
        </span>
        <div className="rounded-full bg-[#e51d54] p-1.5 text-white">
          <Search className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>
    </button>
  );
}

// ─── Filters Button ───────────────────────────────────────────────────────────

function FiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 shadow-sm transition hover:shadow-md"
    >
      <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
      <span className="text-sm font-semibold">Filters</span>
    </button>
  );
}

// ─── Filter Dialog ────────────────────────────────────────────────────────────

type FilterState = {
  recommended: string[];
  placeTypes: Array<"room" | "entire">;
  priceMin: number;
  priceMax: number;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  amenities: string[];
};

function StepperControl({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: number | null;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const displayValue =
    value === null ? "Any" : value === 8 ? "8+" : String(value);
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <span className="text-base font-medium text-gray-800">{label}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onDecrease}
          disabled={value === null}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus className="h-3 w-3" strokeWidth={2.5} />
        </button>
        <span className="w-8 text-center text-base font-medium">
          {displayValue}
        </span>
        <button
          type="button"
          onClick={onIncrease}
          disabled={value === 8}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

const RECOMMENDED_FILTERS = [
  { id: "washer", label: "Washing machine", icon: "🫧" },
  { id: "pets", label: "Allows pets", icon: "🐾" },
  { id: "parking", label: "Free parking", icon: "🅿️" },
  { id: "free_cancel", label: "Free cancellation", icon: "📅" },
];

const AMENITIES = [
  { id: "ac", label: "Air conditioning", icon: "❄️" },
  { id: "wifi", label: "Wifi", icon: "📶" },
  { id: "tv", label: "TV", icon: "📺" },
  { id: "pool", label: "Pool", icon: "🏊" },
  { id: "kitchen", label: "Kitchen", icon: "🍳" },
  { id: "beachfront", label: "Beachfront", icon: "🏖️" },
];

const PRICE_HISTOGRAM_BARS = Array.from({ length: 40 }, (_, index) => ({
  id: `price-bar-${index}`,
  height: Math.max(10, ((index * 37) % 91) + 10),
}));
const PRICE_MIN = 0;
const PRICE_MAX = 50000000;
const PRICE_STEP = 100000;
const RECOMMENDED_AMENITY_LABELS: Record<string, string> = {
  washer: "Washing machine",
  parking: "Free parking",
};

const QUICK_FILTERS = [
  { label: "Washer", type: "amenity", value: "Washing machine" },
  { label: "Wifi", type: "amenity", value: "Wifi" },
  { label: "Instant Book", type: "instantBook", value: "true" },
  { label: "Free parking", type: "amenity", value: "Free parking" },
  { label: "Air conditioning", type: "amenity", value: "Air conditioning" },
  { label: "TV", type: "amenity", value: "TV" },
  { label: "Allows pets", type: "petsAllowed", value: "true" },
  { label: "1+ bathrooms", type: "bathrooms", value: "1" },
  { label: "Gym", type: "amenity", value: "Gym" },
  { label: "Iron", type: "amenity", value: "Iron" },
] as const;

function getQueryAmenities(searchParams: URLSearchParams) {
  const value = searchParams.get("amenities");

  return value
    ? value
        .split(",")
        .map((amenity) => amenity.trim())
        .filter(Boolean)
    : [];
}

function buildQuickFilterHref(
  searchParams: URLSearchParams,
  filter: (typeof QUICK_FILTERS)[number],
) {
  const params = new URLSearchParams(searchParams);
  params.delete("page");

  if (filter.type === "amenity") {
    const amenities = getQueryAmenities(searchParams);
    const active = amenities.some(
      (amenity) => amenity.toLowerCase() === filter.value.toLowerCase(),
    );
    const nextAmenities = active
      ? amenities.filter(
          (amenity) => amenity.toLowerCase() !== filter.value.toLowerCase(),
        )
      : [...amenities, filter.value];

    if (nextAmenities.length > 0) {
      params.set("amenities", nextAmenities.join(","));
    } else {
      params.delete("amenities");
    }
  } else if (params.get(filter.type) === filter.value) {
    params.delete(filter.type);
  } else {
    params.set(filter.type, filter.value);
  }

  const queryString = params.toString();
  return `/search${queryString ? `?${queryString}` : ""}`;
}

function isQuickFilterActive(
  searchParams: URLSearchParams,
  filter: (typeof QUICK_FILTERS)[number],
) {
  if (filter.type === "amenity") {
    return getQueryAmenities(searchParams).some(
      (amenity) => amenity.toLowerCase() === filter.value.toLowerCase(),
    );
  }

  return searchParams.get(filter.type) === filter.value;
}

function QuickFilterBar() {
  const searchParams = useSearchParams();
  const params = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1760px] items-center gap-2.5 overflow-x-auto px-4 pb-3 pt-1 sm:justify-center sm:px-8 xl:px-10">
      {QUICK_FILTERS.map((filter) => {
        const active = isQuickFilterActive(params, filter);

        return (
          <Link
            key={`${filter.type}-${filter.value}`}
            href={buildQuickFilterHref(params, filter)}
            scroll={false}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-medium transition",
              active
                ? "border-neutral-950 bg-white text-neutral-950"
                : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-950",
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}

function FilterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({
    recommended: [],
    placeTypes: [],
    priceMin: PRICE_MIN,
    priceMax: PRICE_MAX,
    bedrooms: null,
    beds: null,
    bathrooms: null,
    amenities: [],
  });

  const toggleRecommended = (id: string) => {
    setFilters((f) => ({
      ...f,
      recommended: f.recommended.includes(id)
        ? f.recommended.filter((x) => x !== id)
        : [...f.recommended, id],
    }));
  };

  const toggleAmenity = (id: string) => {
    setFilters((f) => ({
      ...f,
      amenities: f.amenities.includes(id)
        ? f.amenities.filter((x) => x !== id)
        : [...f.amenities, id],
    }));
  };

  const togglePlaceType = (type: "room" | "entire") => {
    setFilters((f) => ({
      ...f,
      placeTypes: f.placeTypes.includes(type)
        ? f.placeTypes.filter((value) => value !== type)
        : [...f.placeTypes, type],
    }));
  };

  const stepStepper = (key: "bedrooms" | "beds" | "bathrooms", dir: 1 | -1) => {
    setFilters((f) => {
      const cur = f[key];
      if (dir === -1)
        return {
          ...f,
          [key]: cur === null ? null : cur === 1 ? null : cur - 1,
        };
      return { ...f, [key]: cur === null ? 1 : cur >= 8 ? 8 : cur + 1 };
    });
  };

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(n);

  const priceMinPercent =
    ((filters.priceMin - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const priceMaxPercent =
    ((filters.priceMax - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  const updatePriceMin = (value: number) => {
    setFilters((f) => ({
      ...f,
      priceMin: Math.min(value, f.priceMax - PRICE_STEP),
    }));
  };

  const updatePriceMax = (value: number) => {
    setFilters((f) => ({
      ...f,
      priceMax: Math.max(value, f.priceMin + PRICE_STEP),
    }));
  };

  const clearAll = () =>
    setFilters({
      recommended: [],
      placeTypes: [],
      priceMin: PRICE_MIN,
      priceMax: PRICE_MAX,
      bedrooms: null,
      beds: null,
      bathrooms: null,
      amenities: [],
    });

  const applyFilters = () => {
    const params = new URLSearchParams(window.location.search);

    const roomTypes = filters.placeTypes
      .map((type) => (type === "room" ? "PRIVATE_ROOM" : "ENTIRE_PLACE"))
      .join(",");

    if (roomTypes) {
      params.set("roomType", roomTypes);
    } else {
      params.delete("roomType");
    }

    if (filters.bedrooms !== null) {
      params.set("bedrooms", String(filters.bedrooms));
    } else {
      params.delete("bedrooms");
    }

    if (filters.beds !== null) {
      params.set("beds", String(filters.beds));
    } else {
      params.delete("beds");
    }

    if (filters.bathrooms !== null) {
      params.set("bathrooms", String(filters.bathrooms));
    } else {
      params.delete("bathrooms");
    }

    if (filters.priceMin !== PRICE_MIN || filters.priceMax !== PRICE_MAX) {
      params.set("minPrice", String(filters.priceMin));
      params.set("maxPrice", String(filters.priceMax));
    } else {
      params.delete("minPrice");
      params.delete("maxPrice");
    }

    if (filters.recommended.includes("pets")) {
      params.set("petsAllowed", "true");
    } else {
      params.delete("petsAllowed");
    }

    if (filters.recommended.includes("free_cancel")) {
      params.set("freeCancellation", "true");
    } else {
      params.delete("freeCancellation");
    }

    const selectedAmenities = [
      ...filters.amenities
        .map((id) => AMENITIES.find((item) => item.id === id)?.label)
        .filter((label): label is string => Boolean(label)),
      ...filters.recommended
        .map((id) => RECOMMENDED_AMENITY_LABELS[id])
        .filter((label): label is string => Boolean(label)),
    ];
    const uniqueAmenities = Array.from(new Set(selectedAmenities));

    if (uniqueAmenities.length > 0) {
      params.set("amenities", uniqueAmenities.join(","));
    } else {
      params.delete("amenities");
    }

    const queryString = params.toString();
    router.replace(`/search${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-xl w-full p-0 gap-0 overflow-hidden rounded-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <DialogTitle className="text-base font-semibold text-gray-900 flex-1 text-center">
            Filters
          </DialogTitle>
          <div className="w-7" />
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-6 space-y-8">
          {/* Recommended for you */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recommended for you
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {RECOMMENDED_FILTERS.map((item) => {
                const active = filters.recommended.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => toggleRecommended(item.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition",
                      active
                        ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                        : "border-gray-200 hover:border-gray-400",
                    )}
                  >
                    <span className="text-3xl leading-none">{item.icon}</span>
                    <span
                      className={cn(
                        "text-xs font-medium leading-tight",
                        active ? "text-white" : "text-gray-700",
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="h-px bg-gray-200" />

          {/* Type of place */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Type of place
            </h2>
            <div className="flex rounded-full border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, placeTypes: [] }))}
                className={cn(
                  "flex-1 py-3 text-sm font-semibold transition border-r border-gray-200",
                  filters.placeTypes.length === 0
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50",
                )}
              >
                Any type
              </button>
              {(["room", "entire"] as const).map((type) => {
                const active = filters.placeTypes.includes(type);
                return (
                  <button
                    type="button"
                    key={type}
                    onClick={() => togglePlaceType(type)}
                    className={cn(
                      "flex-1 py-3 text-sm font-semibold transition border-r last:border-0 border-gray-200",
                      active
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    {type === "room" ? "Room" : "Entire home"}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="h-px bg-gray-200" />

          {/* Price range */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Price range
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Trip price, includes all fees
            </p>
            <div className="flex items-end gap-0.5 h-16 mb-4">
              {PRICE_HISTOGRAM_BARS.map((bar) => {
                return (
                  <div
                    key={bar.id}
                    className="flex-1 rounded-t-sm bg-[#FF385C] opacity-70"
                    style={{ height: `${bar.height}%` }}
                  />
                );
              })}
            </div>
            <div className="relative h-1 bg-gray-200 rounded-full mb-6">
              <div
                className="absolute h-1 bg-gray-900 rounded-full"
                style={{
                  left: `${priceMinPercent}%`,
                  right: `${100 - priceMaxPercent}%`,
                }}
              />
              <input
                type="range"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={PRICE_STEP}
                value={filters.priceMin}
                onChange={(event) => updatePriceMin(Number(event.target.value))}
                className="pointer-events-none absolute left-0 top-1/2 z-20 h-7 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                aria-label="Minimum price"
              />
              <input
                type="range"
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={PRICE_STEP}
                value={filters.priceMax}
                onChange={(event) => updatePriceMax(Number(event.target.value))}
                className="pointer-events-none absolute left-0 top-1/2 z-30 h-7 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                aria-label="Maximum price"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1 rounded-xl border border-gray-300 px-4 py-3">
                <p className="text-xs text-gray-500">Minimum</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatPrice(filters.priceMin)}
                </p>
              </div>
              <div className="flex-1 rounded-xl border border-gray-300 px-4 py-3">
                <p className="text-xs text-gray-500">Maximum</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatPrice(filters.priceMax)}+
                </p>
              </div>
            </div>
          </section>

          <div className="h-px bg-gray-200" />

          {/* Rooms and beds */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Rooms and beds
            </h2>
            <StepperControl
              label="Bedrooms"
              value={filters.bedrooms}
              onDecrease={() => stepStepper("bedrooms", -1)}
              onIncrease={() => stepStepper("bedrooms", 1)}
            />
            <StepperControl
              label="Beds"
              value={filters.beds}
              onDecrease={() => stepStepper("beds", -1)}
              onIncrease={() => stepStepper("beds", 1)}
            />
            <StepperControl
              label="Bathrooms"
              value={filters.bathrooms}
              onDecrease={() => stepStepper("bathrooms", -1)}
              onIncrease={() => stepStepper("bathrooms", 1)}
            />
          </section>

          <div className="h-px bg-gray-200" />

          {/* Amenities */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Amenities
            </h2>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((item) => {
                const active = filters.amenities.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => toggleAmenity(item.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition",
                      active
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-400",
                    )}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <DialogFooter className="flex flex-row items-center justify-between px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-semibold underline text-gray-800 hover:text-gray-900 transition"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-black transition"
          >
            Show 1,000+ places
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Search Header ────────────────────────────────────────────────────────────

/**
 * SearchHeader — dùng cho trang /search (và các trang tương tự).
 *
 * - Luôn bắt đầu ở chế độ compact (không check scroll vì không phải trang chủ).
 * - Click vào CompactSearchBar → expand SearchBar đầy đủ (với overlay).
 * - Click bên ngoài header hoặc overlay → đóng lại.
 * - Nút Filters → mở FilterDialog (độc lập với trạng thái expand/compact).
 */
function SearchHeader() {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);

  const isHost = useMemo(() => !!token && hasRealmRole(token, "HOST"), [token]);

  const pathname = usePathname();

  const navItems = [
    { label: "Homes", href: "/", icon: "/header/home.png" },
    {
      label: "Experiences",
      href: "/experiences",
      icon: "/header/experience.png",
    },
    { label: "Services", href: "/services", icon: "/header/services.png" },
  ];

  const [searchExpanded, setSearchExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);

  // Đóng search khi click bên ngoài header
  useEffect(() => {
    if (!searchExpanded) return;

    function handleClick(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setSearchExpanded(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [searchExpanded]);

  const showFullSearch = searchExpanded;

  return (
    <>
      {/* Filter Dialog — z-index cao hơn overlay của search */}
      <FilterDialog open={filtersOpen} onOpenChange={setFiltersOpen} />

      {/* Overlay khi search expanded */}
      <button
        type="button"
        aria-label="Close search"
        className={cn(
          "fixed inset-0 z-30 bg-black transition-opacity duration-300",
          searchExpanded
            ? "opacity-40 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={() => setSearchExpanded(false)}
      />

      <header
        ref={headerRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-40 w-full border-b bg-gray-50 transition-all duration-300 md:px-3 lg:px-10",
        )}
      >
        {/* Top row */}
        <div className="relative mx-auto flex items-center justify-between px-4 py-7">
          {/* Logo */}
          <div className="shrink-0">
            <Logo />
          </div>

          {/* Nav items — hiển thị khi expanded */}
          <nav
            className={cn(
              "hidden md:flex items-center gap-3 font-medium transition-all duration-300 absolute left-1/2 -translate-x-1/2",
              showFullSearch
                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                : "opacity-0 scale-95 -translate-y-2 pointer-events-none",
            )}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative flex flex-col items-center justify-center"
                >
                  <div className="flex items-center gap-1">
                    <Image
                      src={item.icon}
                      alt={item.label}
                      width={70}
                      height={12}
                      className="object-contain"
                    />
                    <span
                      className={cn(
                        "transition-colors duration-300",
                        isActive
                          ? "text-black"
                          : "text-gray-500 group-hover:text-black",
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "absolute bottom-0 h-[3px] rounded-full bg-black transition-all duration-300 ease-out",
                      isActive
                        ? "w-full opacity-100 scale-100"
                        : "w-0 opacity-0 scale-0",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Compact Search + Filters — hiển thị khi không expanded */}
          {!showFullSearch && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              <CompactSearchBar onClick={() => setSearchExpanded(true)} />
              <FiltersButton onClick={() => setFiltersOpen(true)} />
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center space-x-6">
            {token && (
              <Link
                href={!token ? "/login" : isHost ? "/host" : "/host/become"}
                className="text-sm hidden lg:flex whitespace-nowrap"
              >
                {isHost ? "Welcoming guests" : "Become a host"}
              </Link>
            )}

            {isAuthenticated && user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt="avatar"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover cursor-pointer"
              />
            ) : (
              <GlobeIcon />
            )}

            <UserMenu />
          </div>
        </div>

        {!showFullSearch ? <QuickFilterBar /> : null}

        {/* Expanded Search Bar */}
        <div
          className={cn(
            "transition-all duration-300 overflow-visible",
            showFullSearch
              ? "opacity-100 pointer-events-auto mt-8"
              : "opacity-0 pointer-events-none h-0 mt-0",
          )}
        >
          <SearchBar className="mt-0" />
        </div>
      </header>
    </>
  );
}

export default SearchHeader;
