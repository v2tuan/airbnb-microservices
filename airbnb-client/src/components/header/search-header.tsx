"use client";

import {
  ChevronDown,
  ChevronUp,
  Menu,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  selectCurrentUser,
  selectIsAuthenticated,
} from "@/features/auth/authSelectors";
import { hasRealmRole } from "@/lib/jwt";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store";
import Logo from "../logo";
import UserMenu from "./user-menu";

type PlaceType = "any" | "room" | "entire";

type FilterState = {
  amenities: string[];
  bathrooms: string;
  bedrooms: string;
  beds: string;
  instantBook: boolean;
  placeType: PlaceType;
  propertyType: string;
};

const amenityChips = [
  "Washer",
  "Wifi",
  "Gym",
  "Free parking",
  "Air conditioning",
  "TV",
  "Allows pets",
];

const recommendedFilters = [
  { id: "washer", label: "Washer", icon: "🧺" },
  { id: "free_parking", label: "Free parking", icon: "🅿️" },
  { id: "tv", label: "TV", icon: "📺" },
  { id: "air_conditioning", label: "Air conditioning", icon: "❄️" },
];

const propertyTypes = [
  { label: "Apartment", value: "APARTMENT" },
  { label: "House", value: "HOUSE" },
  { label: "Villa", value: "VILLA" },
  { label: "Condo", value: "CONDO" },
  { label: "Townhouse", value: "TOWNHOUSE" },
  { label: "Cottage", value: "COTTAGE" },
  { label: "Bungalow", value: "BUNGALOW" },
];

const placeTypeToRoomType: Record<PlaceType, string | undefined> = {
  any: undefined,
  entire: "ENTIRE_PLACE",
  room: "PRIVATE_ROOM",
};

function roomTypeToPlaceType(roomType: string | null): PlaceType {
  if (roomType === "PRIVATE_ROOM" || roomType === "SHARED_ROOM") return "room";
  if (roomType === "ENTIRE_PLACE") return "entire";
  return "any";
}

const histogramBarHeights = [
  8, 10, 12, 18, 26, 38, 54, 72, 86, 98, 92, 82, 96, 88, 78, 74, 68, 80, 72, 64,
  70, 62, 58, 55, 52, 48, 45, 42, 38, 35, 32, 30, 28, 25, 23, 20, 18, 16, 14,
  12,
];

const histogramBars = histogramBarHeights.map((height, index) => ({
  height,
  id: `price-bar-${index + 1}`,
}));

function buildSearchHref(
  currentParams: URLSearchParams,
  updates: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams(currentParams.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || `${value}`.trim() === "") {
      params.delete(key);
    } else {
      params.set(key, `${value}`);
    }
  });

  params.delete("page");
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

function FilterChip({
  active,
  children,
  className,
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition",
        active
          ? "border-neutral-950 bg-white text-neutral-950 shadow-sm"
          : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-950",
        className,
      )}
    >
      {children}
    </span>
  );
}

function PricePopover() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "0");
  const [maxPrice, setMaxPrice] = useState(
    searchParams.get("maxPrice") ?? "2000000",
  );
  const isActive =
    !!searchParams.get("minPrice") || !!searchParams.get("maxPrice");
  const safeMin = Math.min(Number(minPrice) || 0, Number(maxPrice) || 2000000);
  const safeMax = Math.max(Number(maxPrice) || 2000000, safeMin + 10000);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-expanded={open}>
          <FilterChip active={open || isActive}>
            Price
            {open ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </FilterChip>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={12}
        className="w-[490px] gap-0 rounded-xl p-0"
      >
        <form action="/search">
          <input
            type="hidden"
            name="city"
            value={searchParams.get("city") ?? ""}
          />
          <input
            type="hidden"
            name="guests"
            value={searchParams.get("guests") ?? ""}
          />
          <input
            type="hidden"
            name="roomType"
            value={searchParams.get("roomType") ?? ""}
          />
          {[
            "propertyType",
            "amenity",
            "amenities",
            "bedrooms",
            "beds",
            "bathrooms",
            "instantBook",
          ].map((name) => (
            <input
              key={name}
              type="hidden"
              name={name}
              value={searchParams.get(name) ?? ""}
            />
          ))}
          <div className="px-8 py-8">
            <p className="text-lg font-medium text-neutral-950">
              Price per night
            </p>

            <div className="mt-9 flex h-24 items-end gap-1">
              {histogramBars.map((bar) => (
                <div
                  key={bar.id}
                  className="flex-1 rounded-t-sm bg-rose-600"
                  style={{ height: `${bar.height}%` }}
                />
              ))}
            </div>

            <div className="relative mt-[-2px] h-12">
              <div className="absolute left-5 right-5 top-1 h-px bg-rose-600" />
              <input
                aria-label="Minimum price"
                className="pointer-events-auto absolute left-0 right-0 top-[-18px] h-10 w-full cursor-pointer appearance-none bg-transparent accent-rose-600"
                max="2000000"
                min="0"
                name="minPrice"
                onChange={(event) => {
                  const next = Math.min(
                    Number(event.target.value),
                    safeMax - 10000,
                  );
                  setMinPrice(String(next));
                }}
                step="10000"
                type="range"
                value={safeMin}
              />
              <input
                aria-label="Maximum price"
                className="pointer-events-auto absolute left-0 right-0 top-[-18px] h-10 w-full cursor-pointer appearance-none bg-transparent accent-rose-600"
                max="2000000"
                min="0"
                name="maxPrice"
                onChange={(event) => {
                  const next = Math.max(
                    Number(event.target.value),
                    safeMin + 10000,
                  );
                  setMaxPrice(String(next));
                }}
                step="10000"
                type="range"
                value={safeMax}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-28">
              <label>
                <span className="block text-center text-sm font-semibold text-neutral-500">
                  Minimum
                </span>
                <input
                  inputMode="numeric"
                  onChange={(event) => setMinPrice(event.target.value)}
                  placeholder="0"
                  value={minPrice}
                  className="mt-2 h-14 w-full rounded-full border border-neutral-300 px-6 text-center text-base font-medium outline-none focus:border-neutral-950"
                />
              </label>
              <label>
                <span className="block text-center text-sm font-semibold text-neutral-500">
                  Maximum
                </span>
                <input
                  inputMode="numeric"
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="2000000"
                  value={maxPrice}
                  className="mt-2 h-14 w-full rounded-full border border-neutral-300 px-6 text-center text-base font-medium outline-none focus:border-neutral-950"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-200 px-8 py-5">
            <Link
              href={buildSearchHref(searchParams, {
                minPrice: undefined,
                maxPrice: undefined,
              })}
              className="text-sm font-semibold text-neutral-400 underline-offset-4 hover:text-neutral-950 hover:underline"
            >
              Clear
            </Link>
            <button
              type="submit"
              className="h-12 rounded-xl bg-neutral-950 px-6 text-sm font-bold text-white transition hover:bg-black"
            >
              Show 1,000+ places
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function TypePopover() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const placeType = roomTypeToPlaceType(searchParams.get("roomType"));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-expanded={open}>
          <FilterChip active={open || placeType !== "any"}>
            Type of place
            {open ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </FilterChip>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={12}
        className="w-[490px] gap-0 rounded-xl p-0"
      >
        <div className="px-8 py-8">
          <div className="grid grid-cols-3 rounded-full bg-neutral-100 p-1">
            {(["any", "room", "entire"] as const).map((type) => (
              <Link
                key={type}
                href={buildSearchHref(searchParams, {
                  roomType: placeTypeToRoomType[type],
                })}
                className={cn(
                  "flex h-12 items-center justify-center rounded-full text-sm font-bold transition",
                  placeType === type
                    ? "bg-white text-neutral-950 shadow-sm"
                    : "text-neutral-700 hover:text-neutral-950",
                )}
              >
                {type === "any"
                  ? "Any type"
                  : type === "room"
                    ? "Room"
                    : "Entire home"}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-8 py-5">
          <Link
            href={buildSearchHref(searchParams, { roomType: undefined })}
            className="text-sm font-semibold text-neutral-400 underline-offset-4 hover:text-neutral-950 hover:underline"
          >
            Clear
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-12 rounded-xl bg-neutral-950 px-6 text-sm font-bold text-white transition hover:bg-black"
          >
            Show 1,000+ places
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FiltersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>({
    amenities: searchParams.get("amenities")?.split(",").filter(Boolean) ?? [],
    bathrooms: searchParams.get("bathrooms") ?? "",
    bedrooms: searchParams.get("bedrooms") ?? "",
    beds: searchParams.get("beds") ?? "",
    instantBook: searchParams.get("instantBook") === "true",
    placeType: roomTypeToPlaceType(searchParams.get("roomType")),
    propertyType: searchParams.get("propertyType") ?? "",
  });

  const toggleAmenity = (id: string) => {
    setFilters((current) => ({
      ...current,
      amenities: current.amenities.includes(id)
        ? current.amenities.filter((item) => item !== id)
        : [...current.amenities, id],
    }));
  };

  const clearAll = () =>
    setFilters({
      amenities: [],
      bathrooms: "",
      bedrooms: "",
      beds: "",
      instantBook: false,
      placeType: "any",
      propertyType: "",
    });

  const applyFilters = () => {
    window.location.href = buildSearchHref(searchParams, {
      amenities:
        filters.amenities.length > 0 ? filters.amenities.join(",") : undefined,
      bathrooms: filters.bathrooms || undefined,
      bedrooms: filters.bedrooms || undefined,
      beds: filters.beds || undefined,
      instantBook: filters.instantBook ? "true" : undefined,
      propertyType: filters.propertyType || undefined,
      roomType: placeTypeToRoomType[filters.placeType],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] !max-w-[720px] gap-0 overflow-hidden rounded-[2rem] p-0">
        <DialogHeader className="border-b border-neutral-200 px-8 py-5">
          <DialogTitle className="text-center text-base font-bold">
            Filters
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(88vh-150px)] overflow-y-auto px-8 py-8">
          <section>
            <h2 className="text-2xl font-semibold text-neutral-950">
              Recommended for you
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {recommendedFilters.map((item) => {
                const active = filters.amenities.includes(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleAmenity(item.id)}
                    className={cn(
                      "flex h-36 flex-col items-center justify-center gap-4 rounded-xl border text-center transition",
                      active
                        ? "border-neutral-950 bg-neutral-50"
                        : "border-neutral-300 bg-white hover:border-neutral-950",
                    )}
                  >
                    <span className="text-5xl leading-none">{item.icon}</span>
                    <span className="text-base font-medium text-neutral-900">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="my-8 h-px bg-neutral-200" />

          <section>
            <h2 className="text-2xl font-semibold text-neutral-950">
              Type of place
            </h2>
            <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-full border border-neutral-300">
              {(["any", "room", "entire"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({ ...current, placeType: type }))
                  }
                  className={cn(
                    "h-16 border-r border-neutral-300 text-base font-bold last:border-r-0",
                    filters.placeType === type
                      ? "bg-white shadow-[inset_0_0_0_2px_#111]"
                      : "bg-white text-neutral-800 hover:bg-neutral-50",
                  )}
                >
                  {type === "any"
                    ? "Any type"
                    : type === "room"
                      ? "Room"
                      : "Entire home"}
                </button>
              ))}
            </div>
          </section>

          <div className="my-8 h-px bg-neutral-200" />

          <section>
            <h2 className="text-2xl font-semibold text-neutral-950">
              Property type
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {propertyTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      propertyType:
                        current.propertyType === type.value ? "" : type.value,
                    }))
                  }
                  className={cn(
                    "h-12 rounded-full border px-4 text-sm font-semibold transition",
                    filters.propertyType === type.value
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-950",
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </section>

          <div className="my-8 h-px bg-neutral-200" />

          <section>
            <h2 className="text-2xl font-semibold text-neutral-950">
              Rooms and beds
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["bedrooms", "Bedrooms"],
                ["beds", "Beds"],
                ["bathrooms", "Bathrooms"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-sm font-semibold text-neutral-600">
                    {label}
                  </span>
                  <input
                    inputMode="numeric"
                    min="1"
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    placeholder="Any"
                    type="number"
                    value={filters[key as "bedrooms" | "beds" | "bathrooms"]}
                    className="mt-2 h-12 w-full rounded-lg border border-neutral-300 px-4 text-base outline-none focus:border-neutral-950"
                  />
                </label>
              ))}
            </div>
          </section>

          <div className="my-8 h-px bg-neutral-200" />

          <section>
            <label className="flex items-center justify-between rounded-xl border border-neutral-300 p-5">
              <span>
                <span className="block text-lg font-semibold text-neutral-950">
                  Instant book
                </span>
                <span className="block text-sm text-neutral-500">
                  Only show listings that can be booked instantly.
                </span>
              </span>
              <input
                checked={filters.instantBook}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    instantBook: event.target.checked,
                  }))
                }
                type="checkbox"
                className="size-5 accent-neutral-950"
              />
            </label>
          </section>
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t border-neutral-200 px-8 py-5">
          <button
            type="button"
            onClick={clearAll}
            className="text-base font-bold text-neutral-400 underline-offset-4 hover:text-neutral-950 hover:underline"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={applyFilters}
            className="h-12 rounded-xl bg-neutral-950 px-7 text-base font-bold text-white transition hover:bg-black"
          >
            Apply filters
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SearchPill() {
  const searchParams = useSearchParams();
  const destination =
    searchParams.get("city") || searchParams.get("q") || "Homes nearby";

  return (
    <form
      action="/search"
      className="mx-auto hidden h-14 w-[min(540px,42vw)] items-center overflow-hidden rounded-full border border-neutral-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.12)] md:flex"
    >
      <label className="flex h-full min-w-0 flex-1 items-center gap-3 pl-6 pr-4">
        <Image
          src="/header/home.png"
          alt=""
          width={46}
          height={30}
          className="h-8 w-10 object-contain"
        />
        <input
          name="city"
          defaultValue={destination === "Homes nearby" ? "" : destination}
          placeholder="Homes nearby"
          className="min-w-0 flex-1 bg-transparent text-base font-bold text-neutral-950 outline-none placeholder:text-neutral-950"
        />
      </label>
      <div className="h-8 w-px bg-neutral-200" />
      <button
        type="button"
        className="h-full px-6 text-base font-bold text-neutral-950"
      >
        Any week
      </button>
      <div className="h-8 w-px bg-neutral-200" />
      <label className="flex h-full min-w-0 items-center px-5">
        <input
          name="guests"
          defaultValue={searchParams.get("guests") ?? ""}
          inputMode="numeric"
          placeholder="Add guests"
          className="w-24 bg-transparent text-base font-bold text-neutral-950 outline-none placeholder:text-neutral-950"
        />
      </label>
      <button
        type="submit"
        className="mr-2 flex size-11 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white transition hover:bg-rose-700"
        aria-label="Search"
      >
        <Search className="size-5" />
      </button>
    </form>
  );
}

function SearchHeader() {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);
  const isHost = useMemo(() => !!token && hasRealmRole(token, "HOST"), [token]);
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <>
      <FiltersDialog open={filtersOpen} onOpenChange={setFiltersOpen} />

      <header className="fixed left-0 right-0 top-0 z-40 border-b border-neutral-200 bg-white">
        <div className="relative flex h-24 items-center justify-between px-6 lg:px-16">
          <div className="shrink-0">
            <Logo />
          </div>

          <SearchPill />

          <div className="flex items-center gap-4">
            {token ? (
              <Link
                href={isHost ? "/host" : "/host/become"}
                className="hidden whitespace-nowrap text-sm font-bold text-neutral-950 lg:block"
              >
                {isHost ? "Switch to hosting" : "Become a host"}
              </Link>
            ) : (
              <Link
                href="/host/become"
                className="hidden whitespace-nowrap text-sm font-bold text-neutral-950 lg:block"
              >
                Switch to hosting
              </Link>
            )}

            {isAuthenticated && user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt="avatar"
                width={48}
                height={48}
                className="size-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-full bg-blue-100 text-base font-bold text-blue-700">
                H
              </div>
            )}

            <div className="hidden md:block">
              <UserMenu />
            </div>
            <button
              type="button"
              className="flex size-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-950 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>

        <div className="border-t border-neutral-100 px-4 py-4 lg:px-16">
          <div className="mx-auto flex max-w-[1120px] items-center gap-3 overflow-x-auto">
            <button type="button" onClick={() => setFiltersOpen(true)}>
              <FilterChip>
                <SlidersHorizontal className="size-4" />
                Filters
              </FilterChip>
            </button>

            <div className="hidden h-8 w-px shrink-0 bg-neutral-200 sm:block" />

            <PricePopover />
            <TypePopover />

            {amenityChips.map((label) => (
              <Link
                key={label}
                href={buildSearchHref(searchParams, {
                  amenity: label.toLowerCase().replace(/\s+/g, "_"),
                })}
              >
                <FilterChip>{label}</FilterChip>
              </Link>
            ))}

            {(searchParams.get("minPrice") || searchParams.get("maxPrice")) && (
              <Link
                href={buildSearchHref(searchParams, {
                  minPrice: undefined,
                  maxPrice: undefined,
                })}
              >
                <FilterChip className="border-neutral-950">
                  Clear price
                  <X className="size-4" />
                </FilterChip>
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export default SearchHeader;
