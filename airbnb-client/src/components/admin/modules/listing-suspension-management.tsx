"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listAdminListings,
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

    listAdminListings(token)
      .then((response) => {
        if (!active) return;
        setItems(response.data ?? []);
      })
      .catch((err) => {
        if (!active) return;
        setItems([]);
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
  }, [token]);

  const metrics = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.status === "ACTIVE").length,
      suspended: items.filter((item) => item.status === "SUSPENDED").length,
    }),
    [items],
  );

  const canSubmit = listingId.trim() && reason.trim();

  async function submitSuspend() {
    if (!canSubmit) return;
    setSubmitting("suspend");
    setActionMessage(null);
    try {
      await suspendAdminListing(token, listingId.trim(), {
        reason: reason.trim(),
        suspendedUntil: suspendedUntil || undefined,
      });
      setActionMessage("Listing suspended.");
      setItems((current) =>
        current.map((item) =>
          item.listingId === listingId.trim()
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
    if (!canSubmit) return;
    setSubmitting("unsuspend");
    setActionMessage(null);
    try {
      await unsuspendAdminListing(token, listingId.trim(), reason.trim());
      setActionMessage("Listing unsuspended.");
      setItems((current) =>
        current.map((item) =>
          item.listingId === listingId.trim()
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
        title="Listing suspension management"
        description="Suspend or unsuspend listings. Suspension blocks new booking requests but must not automatically cancel existing bookings."
      />
      <div className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <AdminMetricCard
            label="Listings"
            value={metrics.total}
            note="Rows returned by listing API."
            accent="brand"
          />
          <AdminMetricCard
            label="Active"
            value={metrics.active}
            note="Bookable listings."
            accent="success"
          />
          <AdminMetricCard
            label="Suspended"
            value={metrics.suspended}
            note="Not bookable for new requests."
            accent="danger"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <AdminCard className="p-0">
            <AdminSectionHeader
              title="Listing inventory"
              description="Suspended listings are excluded from new booking requests without cancelling existing bookings."
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
                        <div>
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
                      <p className="mt-3 text-xs text-[#6a6a6a]">
                        {item.listingId}
                      </p>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard className="h-fit">
            <div className="rounded-[14px] border border-[#ebebeb] bg-[#f7f7f7] p-5">
              <h2 className="text-base font-semibold text-[#222222]">
                Status action
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6a6a6a]">
                Suspension controls bookability only. Existing reservations
                remain governed by their booking lifecycle.
              </p>
            </div>
            <div className="mt-5 space-y-4">
              <FieldLabel label="Listing id">
                <Input
                  value={listingId}
                  onChange={(event) => setListingId(event.target.value)}
                  placeholder="UUID"
                  className="h-14 rounded-[8px]"
                />
              </FieldLabel>
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
