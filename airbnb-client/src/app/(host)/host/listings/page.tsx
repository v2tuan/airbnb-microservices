"use client";

import { isAxiosError } from "axios";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
  X,
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

const LISTINGS_PAGE_SIZE = 12;
const statusFilters: Array<{ label: string; value: ListingStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Draft", value: "DRAFT" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
];

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

function normalizePageMeta(payload: unknown) {
  type PagePayload = PageResponse<HostListingItem> & {
    number?: number;
    size?: number;
  };

  const source = unwrapApiData(payload as PagePayload | ListingResponse[]) as
    | PagePayload
    | ListingResponse[];

  if (Array.isArray(source)) {
    return {
      page: 0,
      size: source.length,
      totalElements: source.length,
      totalPages: 1,
    };
  }

  return {
    page: source.page ?? source.number ?? 0,
    size: source.size ?? LISTINGS_PAGE_SIZE,
    totalElements: source.totalElements ?? 0,
    totalPages: Math.max(1, source.totalPages ?? 1),
  };
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

  if (status === "SUSPENDED") {
    return {
      label: "Suspended",
      dot: "bg-[#c13515]",
      pill: "bg-white text-[#c13515]",
    };
  }

  if (status === "DRAFT") {
    return {
      label: "Draft",
      dot: "bg-[#717171]",
      pill: "bg-white text-[#222222]",
    };
  }

  return {
    label: "Inactive",
    dot: "bg-[#e07912]",
    pill: "bg-white text-[#222222]",
  };
}

function isListingActive(item: HostListingItem) {
  return item.status === "ACTIVE";
}

function isListingSuspended(item: HostListingItem) {
  return item.status === "SUSPENDED";
}

function getToggleStatusLabel(item: HostListingItem) {
  if (isListingSuspended(item)) return "Suspended";
  return isListingActive(item) ? "Deactivate" : "Activate";
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallback;
  }

  return fallback;
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "ALL">(
    "ALL",
  );
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
        page: page - 1,
        size: LISTINGS_PAGE_SIZE,
        keyword: keyword || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      const meta = normalizePageMeta(response.data);
      setItems(normalizeItems(response.data));
      setTotalPages(meta.totalPages);
      setTotalElements(meta.totalElements);

      if (page > meta.totalPages) {
        setPage(meta.totalPages);
      }
    } catch {
      setError("Unable to load your listings.");
    } finally {
      setLoading(false);
    }
  }, [hostId, isHost, keyword, page, statusFilter]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const handleSearch = () => {
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setKeyword("");
    setPage(1);
  };

  const handleStatusFilter = (nextStatus: ListingStatus | "ALL") => {
    setStatusFilter(nextStatus);
    setPage(1);
  };

  const handleDelete = async (listingId: string) => {
    if (!token) return;
    if (!window.confirm("Delete this listing?")) return;

    setSavingId(`delete-${listingId}`);
    try {
      await listingAPI.deleteListing(token, listingId);
      if (items.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        void loadListings();
      }
    } finally {
      setSavingId("");
    }
  };

  const handleToggleStatus = async (item: HostListingItem) => {
    if (!token) return;
    if (isListingSuspended(item)) {
      window.alert(
        "This listing is suspended by admin and cannot be activated.",
      );
      return;
    }

    const nextAction = isListingActive(item) ? "deactivate" : "activate";
    setSavingId(`${nextAction}-${item.id}`);
    try {
      if (nextAction === "activate") {
        await listingAPI.activateListing(token, item.id);
      } else {
        await listingAPI.deactivateListing(token, item.id);
      }
      window.alert(
        nextAction === "activate"
          ? "Listing activated successfully."
          : "Listing deactivated successfully.",
      );
      void loadListings();
    } catch (error) {
      window.alert(
        getActionErrorMessage(
          error,
          nextAction === "activate"
            ? "Unable to activate this listing."
            : "Unable to deactivate this listing.",
        ),
      );
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

        <div className="mt-8 flex flex-col gap-4 rounded-[14px] border border-[#dddddd] bg-white p-4 md:flex-row md:items-center md:justify-between">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch();
            }}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-[#dddddd] px-4 focus-within:border-[#222222]">
              <Search className="size-4 shrink-0 text-[#6a6a6a]" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by listing name or city"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#222222] outline-none placeholder:text-[#6a6a6a]"
              />
              {keyword ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="inline-flex size-8 items-center justify-center rounded-full text-[#6a6a6a] hover:bg-[#f2f2f2]"
                  aria-label="Clear listing search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#222222] px-5 text-sm font-semibold text-white transition hover:bg-black"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {statusFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleStatusFilter(option.value)}
                className={`h-10 rounded-full border px-4 text-sm font-semibold transition ${
                  statusFilter === option.value
                    ? "border-[#222222] bg-[#222222] text-white"
                    : "border-[#dddddd] bg-white text-[#222222] hover:border-[#222222]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {!loading && !error && totalElements > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6a6a6a]">
            <p>
              Showing {(page - 1) * LISTINGS_PAGE_SIZE + 1}-
              {Math.min(page * LISTINGS_PAGE_SIZE, totalElements)} of{" "}
              {totalElements} listings
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="inline-flex size-10 items-center justify-center rounded-full border border-[#dddddd] text-[#222222] transition hover:border-[#222222] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Previous listings page"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-20 text-center font-medium text-[#222222]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page >= totalPages}
                className="inline-flex size-10 items-center justify-center rounded-full border border-[#dddddd] text-[#222222] transition hover:border-[#222222] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Next listings page"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        ) : null}

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
              {keyword || statusFilter !== "ALL"
                ? "No listings match your filters"
                : "No listings yet"}
            </p>
            <p className="mt-1 text-[#6a6a6a]">
              {keyword || statusFilter !== "ALL"
                ? "Try another name, city, or status."
                : "Start with the basics, then add pricing, photos, and rules."}
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
                            className="inline-flex h-9 items-center gap-2 rounded-full bg-[#f2f2f2] px-3 text-xs font-semibold text-[#222222] hover:bg-[#ebebeb]"
                            aria-label={`Edit ${getListingTitle(item)}`}
                          >
                            <Pencil className="size-4" />
                            Edit
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
                              isListingSuspended(item) ||
                              savingId === `activate-${item.id}` ||
                              savingId === `deactivate-${item.id}`
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-full bg-[#f2f2f2] px-3 text-xs font-semibold text-[#222222] hover:bg-[#ebebeb] disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`${getToggleStatusLabel(item)} ${getListingTitle(item)}`}
                            title={
                              isListingSuspended(item)
                                ? "Suspended listings can only be restored by admin"
                                : getToggleStatusLabel(item)
                            }
                          >
                            {savingId === `activate-${item.id}` ||
                            savingId === `deactivate-${item.id}` ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : isListingSuspended(item) ? (
                              <PowerOff className="size-4" />
                            ) : isListingActive(item) ? (
                              <PowerOff className="size-4" />
                            ) : (
                              <Power className="size-4" />
                            )}
                            {getToggleStatusLabel(item)}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            disabled={savingId === `delete-${item.id}`}
                            className="inline-flex h-9 items-center gap-2 rounded-full bg-[#f2f2f2] px-3 text-xs font-semibold text-[#c13515] hover:bg-[#ebebeb] disabled:opacity-60"
                            aria-label={`Delete ${getListingTitle(item)}`}
                          >
                            {savingId === `delete-${item.id}` ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            Delete
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
          <section className="mt-10 grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {items.map((item) => (
              <article key={item.id} className="group">
                <Link href={`/host/listings/${item.id}`} className="block">
                  <div className="relative aspect-[5/3] overflow-hidden rounded-[10px] bg-[#dddddd]">
                    <ListingImage item={item} />
                    <div className="absolute left-2.5 top-2.5">
                      <StatusPill status={item.status} />
                    </div>
                  </div>
                  <h2 className="mt-2.5 line-clamp-1 text-[15px] font-semibold text-[#222222]">
                    {getListingTitle(item)}
                  </h2>
                  <p className="mt-0.5 line-clamp-1 text-[13px] text-[#6a6a6a]">
                    {getListingType(item)}
                    {item.location || item.city
                      ? ` in ${item.location || item.city}`
                      : ""}
                  </p>
                </Link>

                <div className="mt-2.5 flex flex-wrap gap-1.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                  <Link
                    href={`/host/listings/${item.id}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#f2f2f2] px-2.5 text-[11px] font-semibold text-[#222222] hover:bg-[#ebebeb]"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Link>
                  <Link
                    href={`/host/reservations?listingId=${item.id}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#f2f2f2] px-2.5 text-[11px] font-semibold text-[#222222] hover:bg-[#ebebeb]"
                  >
                    <CalendarCheck className="size-3.5" />
                    Booking
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleToggleStatus(item)}
                    disabled={
                      isListingSuspended(item) ||
                      savingId === `activate-${item.id}` ||
                      savingId === `deactivate-${item.id}`
                    }
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#f2f2f2] px-2.5 text-[11px] font-semibold text-[#222222] hover:bg-[#ebebeb] disabled:cursor-not-allowed disabled:opacity-60"
                    title={
                      isListingSuspended(item)
                        ? "Suspended listings can only be restored by admin"
                        : getToggleStatusLabel(item)
                    }
                  >
                    {savingId === `activate-${item.id}` ||
                    savingId === `deactivate-${item.id}` ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : isListingSuspended(item) ? (
                      <PowerOff className="size-3.5" />
                    ) : isListingActive(item) ? (
                      <PowerOff className="size-3.5" />
                    ) : (
                      <Power className="size-3.5" />
                    )}
                    {getToggleStatusLabel(item)}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    disabled={savingId === `delete-${item.id}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#f2f2f2] px-2.5 text-[11px] font-semibold text-[#c13515] hover:bg-[#ebebeb] disabled:opacity-60"
                  >
                    {savingId === `delete-${item.id}` ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
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
