"use client";

import { Ban, ChevronLeft, ChevronRight, Home, ListChecks } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  listAdminListings,
  type PageResponse,
  suspendAdminListing,
  unsuspendAdminListing,
} from "@/api/endpoints/admin";
import type { ListingResponse } from "@/api/endpoints/listing";
import { useAdminToken } from "@/components/admin/admin-shell";
import {
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingRows,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionHeader,
  FieldLabel,
  getAdminErrorMessage,
  TextStatusPill,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ListingSuspensionManagementModule() {
  const { token } = useAdminToken();
  const [items, setItems] = useState<ListingResponse[]>([]);
  const [pageData, setPageData] =
    useState<PageResponse<ListingResponse> | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listingId, setListingId] = useState("");
  const [reason, setReason] = useState("");
  const [suspendedUntil, setSuspendedUntil] = useState("");
  const [submitting, setSubmitting] = useState<"suspend" | "unsuspend" | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listAdminListings(token, { page, size: pageSize })
      .then((response) => {
        if (!active) return;
        const data = response.data;
        setPageData(data ?? null);
        setItems(data?.content ?? []);
      })
      .catch((err) => {
        if (!active) return;
        setItems([]);
        setPageData(null);
        setError(
          getAdminErrorMessage(
            err,
            "Unable to load listings. Backend should expose an admin listing search endpoint when public /listings is insufficient.",
          ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, page]);

  const metrics = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.status === "ACTIVE").length,
      suspended: items.filter((item) => item.status === "SUSPENDED").length,
    }),
    [items],
  );

  const totalPages = Math.max(pageData?.totalPages ?? 1, 1);
  const displayPage = Math.min(page + 1, totalPages);
  const firstItem =
    pageData && pageData.totalElements > 0 ? page * pageSize + 1 : 0;
  const lastItem = pageData
    ? Math.min((page + 1) * pageSize, pageData.totalElements)
    : items.length;

  const selectedListing = useMemo(
    () => items.find((item) => item.listingId === listingId) ?? null,
    [items, listingId],
  );

  const canSubmit = !!selectedListing && reason.trim();

  function formatListingPrice(item: ListingResponse) {
    const amount = item.pricing?.basePrice;
    if (amount == null) return "No price";

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: item.pricing?.currency || "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatListingType(item: ListingResponse) {
    return [item.propertyType, item.roomType]
      .filter(Boolean)
      .map((value) => value.toLowerCase().replaceAll("_", " "))
      .join(" / ");
  }

  async function submitSuspend() {
    if (!canSubmit || !selectedListing) return;
    setSubmitting("suspend");
    setActionMessage(null);
    try {
      await suspendAdminListing(token, selectedListing.listingId, {
        reason: reason.trim(),
        suspendedUntil: suspendedUntil || undefined,
      });
      setActionMessage("Listing suspended.");
      setItems((current) =>
        current.map((item) =>
          item.listingId === selectedListing.listingId
            ? { ...item, status: "SUSPENDED" }
            : item,
        ),
      );
    } catch (err) {
      setActionMessage(getAdminErrorMessage(err, "Suspend listing failed."));
    } finally {
      setSubmitting(null);
    }
  }

  async function submitUnsuspend() {
    if (!canSubmit || !selectedListing) return;
    setSubmitting("unsuspend");
    setActionMessage(null);
    try {
      await unsuspendAdminListing(
        token,
        selectedListing.listingId,
        reason.trim(),
      );
      setActionMessage("Listing unsuspended.");
      setItems((current) =>
        current.map((item) =>
          item.listingId === selectedListing.listingId
            ? { ...item, status: "ACTIVE" }
            : item,
        ),
      );
    } catch (err) {
      setActionMessage(getAdminErrorMessage(err, "Unsuspend listing failed."));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Listing operations"
        title="Listing management"
        description="Review listing inventory, status, location and bookability controls from listing-service."
      />
      <div className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <AdminMetricCard
            label="Listings"
            value={pageData?.totalElements ?? metrics.total}
            note="Total listing records."
            accent="brand"
            icon={Home}
          />
          <AdminMetricCard
            label="Active"
            value={metrics.active}
            note="Bookable listings."
            accent="success"
            icon={ListChecks}
          />
          <AdminMetricCard
            label="Suspended"
            value={metrics.suspended}
            note="Not bookable for new requests."
            accent="danger"
            icon={Ban}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <AdminCard className="p-0">
            <AdminSectionHeader
              title="Listing inventory"
              description="Select a listing to manage bookability. Existing reservations remain governed by their booking lifecycle."
            />
            <div className="p-5">
              {loading ? <AdminLoadingRows /> : null}
              {!loading && error ? (
                <AdminErrorState description={error} />
              ) : null}
              {!loading && !error && items.length === 0 ? (
                <AdminEmptyState
                  title="No listings"
                  description="No listing records were returned."
                />
              ) : null}
              {!loading && !error && items.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <button
                      key={item.listingId}
                      type="button"
                      onClick={() => setListingId(item.listingId)}
                      className="rounded-[14px] border border-[#ebebeb] bg-white p-4 text-left transition hover:border-[#dddddd] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.10)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-semibold text-[#222222]">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm text-[#6a6a6a]">
                            {item.city}, {item.country}
                          </p>
                        </div>
                        <TextStatusPill
                          tone={
                            item.status === "SUSPENDED" ? "danger" : "success"
                          }
                        >
                          {item.status}
                        </TextStatusPill>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#6a6a6a]">
                        <span className="truncate capitalize">
                          {formatListingType(item)}
                        </span>
                        <span className="shrink-0 font-semibold text-[#222222]">
                          {formatListingPrice(item)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
              {!loading && !error && pageData && pageData.totalElements > 0 ? (
                <div className="mt-4 flex flex-col gap-3 border-t border-[#eeeeee] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#6a6a6a]">
                    Showing {firstItem}-{lastItem} of {pageData.totalElements}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={page <= 0 || loading}
                      aria-label="Previous listings page"
                      onClick={() =>
                        setPage((current) => Math.max(0, current - 1))
                      }
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="min-w-20 text-center text-sm font-medium text-[#222222]">
                      {displayPage} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={page >= totalPages - 1 || loading}
                      aria-label="Next listings page"
                      onClick={() =>
                        setPage((current) =>
                          Math.min(totalPages - 1, current + 1),
                        )
                      }
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard className="h-fit">
            <div className="rounded-[14px] border border-[#ebebeb] bg-[#f7f7f7] p-5">
              <h2 className="text-base font-semibold text-[#222222]">
                Selected listing
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6a6a6a]">
                Choose a listing from the inventory, then update its bookability
                status.
              </p>
            </div>
            <div className="mt-5 space-y-4">
              {selectedListing ? (
                <div className="rounded-[14px] border border-[#ebebeb] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-base font-semibold text-[#222222]">
                        {selectedListing.title}
                      </p>
                      <p className="mt-1 text-sm text-[#6a6a6a]">
                        {selectedListing.city}, {selectedListing.country}
                      </p>
                    </div>
                    <TextStatusPill
                      tone={
                        selectedListing.status === "SUSPENDED"
                          ? "danger"
                          : "success"
                      }
                    >
                      {selectedListing.status}
                    </TextStatusPill>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-[#6a6a6a]">
                    <div className="flex items-center justify-between gap-3">
                      <span>Type</span>
                      <span className="text-right capitalize text-[#222222]">
                        {formatListingType(selectedListing)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Price</span>
                      <span className="text-right font-semibold text-[#222222]">
                        {formatListingPrice(selectedListing)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Guests</span>
                      <span className="text-right text-[#222222]">
                        {selectedListing.maxGuests}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <AdminEmptyState
                  title="No listing selected"
                  description="Select a listing from the inventory to suspend or restore it."
                />
              )}
              <FieldLabel label="Suspended until">
                <Input
                  value={suspendedUntil}
                  onChange={(event) => setSuspendedUntil(event.target.value)}
                  type="datetime-local"
                  className="h-14 rounded-[8px]"
                />
              </FieldLabel>
              <FieldLabel label="Reason">
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Required admin reason"
                  className="min-h-28 rounded-[8px]"
                />
              </FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={submitSuspend}
                  disabled={!canSubmit || !!submitting}
                  className="h-12 rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41]"
                >
                  {submitting === "suspend" ? "Suspending..." : "Suspend"}
                </Button>
                <Button
                  onClick={submitUnsuspend}
                  disabled={!canSubmit || !!submitting}
                  variant="outline"
                  className="h-12 rounded-[8px]"
                >
                  {submitting === "unsuspend" ? "Restoring..." : "Unsuspend"}
                </Button>
              </div>
              {actionMessage ? (
                <p className="text-sm leading-6 text-[#6a6a6a]">
                  {actionMessage}
                </p>
              ) : null}
            </div>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
