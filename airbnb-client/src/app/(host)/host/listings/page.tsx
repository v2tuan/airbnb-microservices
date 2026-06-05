"use client";

import {
  CalendarCheck,
  Grid3X3,
  List,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  type ApiResponse as ListingApiResponse,
  type ListingItemResponse,
  type ListingResponse,
  type ListingStatus,
  listingAPI,
  type PageResponse,
  type PropertyType,
  unwrapApiData,
} from "@/api/endpoints/listing";
import { hasRealmRole, parseJwt } from "@/lib/jwt";
import type { RootState } from "@/store";

type ViewMode = "table" | "grid";

type HostListingItem = ListingItemResponse & {
  country?: string;
  location?: string;
  propertyType?: PropertyType;
  status?: ListingStatus;
  createdAt?: string;
};

const propertyLabels: Partial<Record<PropertyType, string>> = {
  APARTMENT: "Apartment",
  HOUSE: "Home",
  VILLA: "Villa",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
  COTTAGE: "Cottage",
  BUNGALOW: "Bungalow",
};

function normalizeItems(payload: unknown): HostListingItem[] {
  type HostListingsPayload =
    | ListingApiResponse<ListingResponse[]>
    | ListingResponse[]
    | PageResponse<HostListingItem>;

  const source = unwrapApiData(payload as HostListingsPayload) as
    | ListingResponse[]
    | PageResponse<HostListingItem>;

  if (Array.isArray(source)) {
    return source.map((listing) => ({
      id: listing.listingId,
      title: listing.title,
      thumbnailUrl:
        listing.photos?.find((photo) => photo.isCover)?.photoUrl ??
        listing.photos?.[0]?.photoUrl,
      city: listing.city,
      country: listing.country,
      location: [listing.city, listing.country].filter(Boolean).join(", "),
      propertyType: listing.propertyType,
      status: listing.status,
      createdAt: listing.createdAt,
      shortFeatures: `${listing.numBeds} beds · ${listing.maxGuests} guests`,
    }));
  }

  const page = source as {
    content?: HostListingItem[];
    items?: HostListingItem[];
  };

  return (page.content ?? page.items ?? []).map((item) => {
    const raw = item as HostListingItem & {
      coverImageUrl?: string;
      address?: string;
    };

    return {
      ...item,
      thumbnailUrl: item.thumbnailUrl ?? raw.coverImageUrl,
      location:
        item.location ??
        [raw.address, item.city, item.country].filter(Boolean).join(", "),
    };
  });
}

function getListingTitle(item: HostListingItem) {
  if (item.title?.trim()) return item.title;

  if (item.createdAt) {
    return `Your unique space listing started ${new Intl.DateTimeFormat(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      },
    ).format(new Date(item.createdAt))}`;
  }

  return "Your unique space listing";
}

function getListingType(item: HostListingItem) {
  if (item.propertyType) return propertyLabels[item.propertyType] ?? "Home";
  return "Home";
}

function getStatusMeta(status?: ListingStatus) {
  if (status === "ACTIVE") {
    return {
      label: "Active",
      dot: "bg-emerald-600",
      pill: "bg-white text-[#222222]",
    };
  }

  return {
    label: "Deactive",
    dot: "bg-[#e07912]",
    pill: "bg-white text-[#222222]",
  };
}

function isListingActive(item: HostListingItem) {
  return item.status === "ACTIVE";
}

function StatusBadge({ status }: { status?: ListingStatus }) {
  const meta = getStatusMeta(status);

  return (
    <span className="inline-flex items-center gap-2 text-sm text-[#5f5f5f]">
      <span className={`size-2.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function StatusPill({ status }: { status?: ListingStatus }) {
  const meta = getStatusMeta(status);

  return (
    <span
      className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-sm ${meta.pill}`}
    >
      <span className={`size-2.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function ListingImage({
  item,
  className,
}: {
  item: HostListingItem;
  className?: string;
}) {
  if (!item.thumbnailUrl) {
    return <div className={`bg-[#dddddd] ${className ?? ""}`} />;
  }

  return (
    <Image
      src={item.thumbnailUrl}
      alt={getListingTitle(item)}
      fill
      className={`object-cover ${className ?? ""}`}
      sizes="(max-width: 768px) 96px, 560px"
      unoptimized
    />
  );
}

export default function HostListingsPage() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [items, setItems] = useState<HostListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  const isHost = useMemo(() => !!token && hasRealmRole(token, "HOST"), [token]);
  const hostId = useMemo(
    () => (token ? parseJwt(token)?.sub : undefined),
    [token],
  );

  const loadListings = useCallback(async () => {
    if (!isHost || !hostId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await listingAPI.getListingsByHost(hostId, {
        page: 0,
        size: 48,
      });
      setItems(normalizeItems(response.data));
    } catch {
      setError("Unable to load your listings.");
    } finally {
      setLoading(false);
    }
  }, [hostId, isHost]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const handleDelete = async (listingId: string) => {
    if (!token) return;
    if (!window.confirm("Delete this listing?")) return;

    setSavingId(`delete-${listingId}`);
    try {
      await listingAPI.deleteListing(token, listingId);
      setItems((current) => current.filter((item) => item.id !== listingId));
    } finally {
      setSavingId("");
    }
  };

  const handleToggleStatus = async (item: HostListingItem) => {
    if (!token) return;

    const nextAction = isListingActive(item) ? "deactivate" : "activate";
    setSavingId(`${nextAction}-${item.id}`);
    try {
      if (nextAction === "activate") {
        await listingAPI.activateListing(token, item.id);
      } else {
        await listingAPI.deactivateListing(token, item.id);
      }
      void loadListings();
    } finally {
      setSavingId("");
    }
  };

  if (!token) {
    return (
      <main className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-[14px] border border-[#dddddd] bg-white p-8">
          Please log in to manage listings.
        </div>
      </main>
    );
  }

  if (!isHost) {
    return (
      <main className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-[14px] border border-[#dddddd] bg-white p-8">
          <p className="text-xl font-semibold text-[#222222]">
            Only hosts can manage listings
          </p>
          <p className="mt-2 text-[#6a6a6a]">
            Finish host onboarding to create and edit places.
          </p>
          <Link
            href="/host/become"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[#222222] px-5 text-sm font-semibold text-white"
          >
            Become a host
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-white text-[#222222]">
      <section className="mx-auto w-full max-w-[1720px] px-6 py-10 sm:px-10 lg:px-16">
        <div className="flex items-start justify-between gap-6">
          <h1 className="text-[32px] font-semibold leading-tight tracking-normal">
            Your listings
          </h1>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                setViewMode((current) =>
                  current === "table" ? "grid" : "table",
                )
              }
              className="flex size-12 items-center justify-center rounded-full bg-[#f2f2f2] text-[#222222] transition hover:bg-[#ebebeb]"
              aria-label={
                viewMode === "table"
                  ? "Show listings as cards"
                  : "Show listings as table"
              }
              title={
                viewMode === "table"
                  ? "Show listings as cards"
                  : "Show listings as table"
              }
            >
              {viewMode === "table" ? (
                <Grid3X3 className="size-5" />
              ) : (
                <List className="size-5" />
              )}
            </button>
            <Link
              href="/host/listings/new"
              className="flex size-12 items-center justify-center rounded-full bg-[#f2f2f2] text-[#222222] transition hover:bg-[#ebebeb]"
              aria-label="Create listing"
              title="Create listing"
            >
              <Plus className="size-6" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-20 flex items-center gap-3 text-[#6a6a6a]">
            <Loader2 className="size-5 animate-spin" />
            Loading listings...
          </div>
        ) : error ? (
          <div className="mt-12 rounded-[14px] border border-red-100 bg-red-50 p-6 text-[#c13515]">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-12 rounded-[14px] border border-[#dddddd] bg-white p-8">
            <p className="text-lg font-semibold text-[#222222]">
              No listings yet
            </p>
            <p className="mt-1 text-[#6a6a6a]">
              Start with the basics, then add pricing, photos, and rules.
            </p>
          </div>
        ) : viewMode === "table" ? (
          <div className="mt-16 overflow-x-auto">
            <table className="w-full min-w-[920px] border-separate border-spacing-y-6">
              <thead>
                <tr className="text-left text-sm font-semibold text-[#222222]">
                  <th className="w-[38%] px-10 py-2">Listing</th>
                  <th className="w-[16%] px-5 py-2">Type</th>
                  <th className="w-[27%] px-5 py-2">Location</th>
                  <th className="w-[19%] px-5 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="group">
                    <td className="px-10 py-1">
                      <Link
                        href={`/host/listings/${item.id}`}
                        className="flex items-center gap-7"
                      >
                        <span className="relative size-20 shrink-0 overflow-hidden rounded-[12px] bg-[#dddddd]">
                          <ListingImage item={item} />
                        </span>
                        <span className="line-clamp-2 text-base font-semibold text-[#222222]">
                          {getListingTitle(item)}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-1 text-base text-[#6a6a6a]">
                      {getListingType(item)}
                    </td>
                    <td className="px-5 py-1 text-base text-[#6a6a6a]">
                      {item.location || item.city || "Add location"}
                    </td>
                    <td className="px-5 py-1">
                      <div className="flex items-center justify-between gap-4">
                        <StatusBadge status={item.status} />
                        <div className="flex items-center gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                          <Link
                            href={`/host/listings/${item.id}`}
                            className="flex size-9 items-center justify-center rounded-full bg-[#f2f2f2] text-[#222222] hover:bg-[#ebebeb]"
                            aria-label={`Edit ${getListingTitle(item)}`}
                          >
                            <Pencil className="size-4" />
                          </Link>
                          <Link
                            href={`/host/reservations?listingId=${item.id}`}
                            className="inline-flex h-9 items-center gap-2 rounded-full bg-[#f2f2f2] px-3 text-xs font-semibold text-[#222222] hover:bg-[#ebebeb]"
                            aria-label={`Reservations for ${getListingTitle(item)}`}
                          >
                            <CalendarCheck className="size-4" />
                            Booking
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(item)}
                            disabled={
                              savingId === `activate-${item.id}` ||
                              savingId === `deactivate-${item.id}`
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-full bg-[#f2f2f2] px-3 text-xs font-semibold text-[#222222] hover:bg-[#ebebeb] disabled:opacity-60"
                            aria-label={`${isListingActive(item) ? "Deactivate" : "Activate"} ${getListingTitle(item)}`}
                          >
                            {savingId === `activate-${item.id}` ||
                            savingId === `deactivate-${item.id}` ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : isListingActive(item) ? (
                              <PowerOff className="size-4" />
                            ) : (
                              <Power className="size-4" />
                            )}
                            {isListingActive(item) ? "Deactive" : "Active"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            disabled={savingId === `delete-${item.id}`}
                            className="flex size-9 items-center justify-center rounded-full bg-[#f2f2f2] text-[#c13515] hover:bg-[#ebebeb] disabled:opacity-60"
                            aria-label={`Delete ${getListingTitle(item)}`}
                          >
                            {savingId === `delete-${item.id}` ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <section className="mt-20 grid gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="group">
                <Link href={`/host/listings/${item.id}`} className="block">
                  <div className="relative aspect-square overflow-hidden rounded-[14px] bg-[#dddddd]">
                    <ListingImage item={item} />
                    <div className="absolute top-5 left-5">
                      <StatusPill status={item.status} />
                    </div>
                  </div>
                  <h2 className="mt-5 line-clamp-1 text-lg font-semibold text-[#222222]">
                    {getListingTitle(item)}
                  </h2>
                  <p className="mt-2 line-clamp-1 text-base text-[#6a6a6a]">
                    {getListingType(item)}
                    {item.location || item.city
                      ? ` in ${item.location || item.city}`
                      : ""}
                  </p>
                </Link>

                <div className="mt-4 flex flex-wrap gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  <Link
                    href={`/host/listings/${item.id}`}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f2f2f2] px-4 text-sm font-semibold text-[#222222] hover:bg-[#ebebeb]"
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Link>
                  <Link
                    href={`/host/reservations?listingId=${item.id}`}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f2f2f2] px-4 text-sm font-semibold text-[#222222] hover:bg-[#ebebeb]"
                  >
                    <CalendarCheck className="size-4" />
                    Booking
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleToggleStatus(item)}
                    disabled={
                      savingId === `activate-${item.id}` ||
                      savingId === `deactivate-${item.id}`
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f2f2f2] px-4 text-sm font-semibold text-[#222222] hover:bg-[#ebebeb] disabled:opacity-60"
                  >
                    {savingId === `activate-${item.id}` ||
                    savingId === `deactivate-${item.id}` ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isListingActive(item) ? (
                      <PowerOff className="size-4" />
                    ) : (
                      <Power className="size-4" />
                    )}
                    {isListingActive(item) ? "Deactive" : "Active"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    disabled={savingId === `delete-${item.id}`}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f2f2f2] px-4 text-sm font-semibold text-[#c13515] hover:bg-[#ebebeb] disabled:opacity-60"
                  >
                    {savingId === `delete-${item.id}` ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
