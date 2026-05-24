"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Pencil, Power, Trash2 } from "lucide-react";
import { listingAPI, type ListingItemResponse, type ListingResponse, type ListingStatus, unwrapApiData } from "@/api/endpoints/listing";
import { hasRealmRole, parseJwt } from "@/lib/jwt";
import type { RootState } from "@/store";

const statusOptions: Array<"ALL" | ListingStatus> = ["ALL", "ACTIVE", "DRAFT", "INACTIVE", "PENDING_APPROVAL"];

function normalizeItems(payload: unknown): ListingItemResponse[] {
  const source = unwrapApiData(payload as any) as unknown;

  if (Array.isArray(source)) {
    return source.map((listing: ListingResponse) => ({
      id: listing.listingId,
      title: listing.title,
      thumbnailUrl: listing.photos?.find((photo) => photo.isCover)?.photoUrl ?? listing.photos?.[0]?.photoUrl,
      city: listing.city,
      shortFeatures: `${listing.numBeds} beds · ${listing.maxGuests} guests`,
    }));
  }

  const page = source as { content?: ListingItemResponse[]; items?: ListingItemResponse[] };
  return page.content ?? page.items ?? [];
}

export default function HostListingsPage() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [status, setStatus] = useState<"ALL" | ListingStatus>("ALL");
  const [items, setItems] = useState<ListingItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isHost = useMemo(() => !!token && hasRealmRole(token, "HOST"), [token]);
  const hostId = useMemo(() => (token ? parseJwt(token)?.sub : undefined), [token]);

  const loadListings = async () => {
    if (!isHost || !hostId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await listingAPI.getListingsByHost(hostId, {
        status: status === "ALL" ? undefined : status,
        page: 0,
        size: 24,
      });
      setItems(normalizeItems(response.data));
    } catch {
      setError("Unable to load your listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadListings();
  }, [hostId, isHost, status]);

  const handleDelete = async (listingId: string) => {
    if (!token) return;
    if (!window.confirm("Delete this listing?")) return;
    await listingAPI.deleteListing(token, listingId);
    setItems((current) => current.filter((item) => item.id !== listingId));
  };

  const handleToggleActive = async (listingId: string) => {
    if (!token) return;
    await listingAPI.activateListing(token, listingId);
    void loadListings();
  };

  if (!token) {
    return (
      <main className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-2xl border bg-white p-8">Please log in to manage listings.</div>
      </main>
    );
  }

  if (!isHost) {
    return (
      <main className="mx-auto max-w-5xl px-6 pb-12">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8">
          <p className="text-xl font-semibold text-neutral-950">Only hosts can manage listings</p>
          <p className="mt-2 text-neutral-500">Finish host onboarding to create and edit places.</p>
          <Link
            href="/host/become"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white"
          >
            Become a host
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-500">Hosting</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-neutral-950">Listings</h1>
          <p className="mt-2 text-neutral-500">Create, review, and keep your places bookable.</p>
        </div>

        <Link
          href="/host/listings/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          <Plus className="size-4" />
          New listing
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              status === option ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-950"
            }`}
          >
            {option.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-neutral-500">Loading listings...</p>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8">
          <p className="text-lg font-semibold text-neutral-950">No listings yet</p>
          <p className="mt-1 text-neutral-500">Start with the basics, then add pricing, photos, and rules.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="aspect-[16/10] bg-neutral-100">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <h2 className="line-clamp-1 text-lg font-semibold text-neutral-950">{item.title}</h2>
                  <p className="mt-1 text-sm text-neutral-500">{item.city || "Location not set"}</p>
                  <p className="mt-1 text-sm text-neutral-500">{item.shortFeatures || "Details can be edited anytime."}</p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/host/listings/${item.id}`}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-300 px-4 text-sm font-semibold hover:border-neutral-950"
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Link>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 hover:border-neutral-950"
                      aria-label="Activate listing"
                    >
                      <Power className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-red-600 hover:border-red-300"
                      aria-label="Delete listing"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
