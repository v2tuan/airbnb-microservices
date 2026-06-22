"use client";

import { CalendarDays, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  type AdminReservationDetail,
  type AdminReservationSummary,
  forceCancelAdminBooking,
  getAdminReservationDetail,
  listAdminReservations,
} from "@/api/endpoints/admin";
import { useAdminToken } from "@/components/admin/admin-shell";
import {
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingRows,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionHeader,
  BookingStatusPill,
  canForceCancelStatus,
  FieldLabel,
  formatAdminDate,
  getAdminErrorMessage,
  TextStatusPill,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import type { BookingStatus } from "@/types/booking.type";

const statusOptions: Array<BookingStatus | "ALL"> = [
  "ALL",
  "PENDING_PAYMENT",
  "EXPIRED",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "COMPLETED",
  "CANCELLED_BY_GUEST",
  "CANCELLED_BY_HOST",
  "CANCELLED_BY_ADMIN",
];

type ReservationFilters = {
  status: BookingStatus | "ALL";
  checkInFrom: string;
  checkInTo: string;
  guest: string;
  host: string;
  listing: string;
  bookingCode: string;
};

const initialFilters: ReservationFilters = {
  status: "ALL",
  checkInFrom: "",
  checkInTo: "",
  guest: "",
  host: "",
  listing: "",
  bookingCode: "",
};

function getSummaryCode(item: AdminReservationSummary) {
  return item.reservationCode ?? item.bookingId.slice(0, 8);
}

function getDetailTimeline(
  detail: AdminReservationDetail | null,
  summary: AdminReservationSummary | null,
) {
  if (detail?.timeline?.length) return detail.timeline;
  if (!summary) return [];

  return [
    {
      key: "created",
      label: "Booking created",
      description: "Reservation request entered the booking lifecycle.",
      occurredAt: summary.createdAt,
    },
    {
      key: "check-in",
      label: "Check-in date",
      description: "Expected start of stay.",
      occurredAt: summary.checkInDate,
    },
    {
      key: "check-out",
      label: "Check-out date",
      description: "Expected end of stay.",
      occurredAt: summary.checkOutDate,
    },
  ];
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-[14px] border border-[#ebebeb] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6a6a6a]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-[#222222]">
        {value || "Not available"}
      </p>
    </div>
  );
}

export function ReservationsManagementModule() {
  const { token } = useAdminToken();
  const [items, setItems] = useState<AdminReservationSummary[]>([]);
  const [filters, setFilters] = useState<ReservationFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState("");
  const [reason, setReason] = useState("OPERATIONAL");
  const [adminNote, setAdminNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<AdminReservationSummary | null>(
    null,
  );
  const [detail, setDetail] = useState<AdminReservationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listAdminReservations(token, {
      statuses: filters.status === "ALL" ? undefined : [filters.status],
      checkInFrom: filters.checkInFrom || undefined,
      checkInTo: filters.checkInTo || undefined,
      guest: filters.guest || undefined,
      host: filters.host || undefined,
      listing: filters.listing || undefined,
      bookingCode: filters.bookingCode || undefined,
      page: 0,
      size: 25,
    })
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
            "GET /bookings/admin/reservations is not available yet. Manual force-cancel and detail placeholders remain visible.",
          ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, filters]);

  const metrics = useMemo(() => {
    const forceCancelable = items.filter((item) =>
      canForceCancelStatus(item.status),
    ).length;
    return {
      total: items.length,
      forceCancelable,
      adminCancelled: items.filter(
        (item) => item.status === "CANCELLED_BY_ADMIN",
      ).length,
    };
  }, [items]);

  const canSubmit = bookingId.trim() && reason.trim() && adminNote.trim();
  const timeline = getDetailTimeline(detail, selected);

  function updateFilter<K extends keyof ReservationFilters>(
    key: K,
    value: ReservationFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(initialFilters);
  }

  function openDetail(item: AdminReservationSummary) {
    setSelected(item);
    setDetail(null);
    setDetailError(null);
    setDrawerOpen(true);
    setDetailLoading(true);

    getAdminReservationDetail(token, item.bookingId)
      .then((response) => {
        setDetail(response.data ?? null);
      })
      .catch((err) => {
        setDetailError(
          getAdminErrorMessage(
            err,
            "GET /bookings/admin/reservations/{bookingId} is not available yet. Showing data from the reservation list row.",
          ),
        );
      })
      .finally(() => setDetailLoading(false));
  }

  async function submitForceCancel() {
    if (!canSubmit) return;

    setSubmitting(true);
    setActionMessage(null);
    try {
      await forceCancelAdminBooking(token, bookingId.trim(), {
        reason: reason.trim(),
        adminNote: adminNote.trim(),
        refundAmount: refundAmount ? Number(refundAmount) : undefined,
      });
      setActionMessage("Force cancellation submitted successfully.");
      setBookingId("");
      setRefundAmount("");
    } catch (err) {
      setActionMessage(getAdminErrorMessage(err, "Force cancellation failed."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Reservations"
        title="Bookings and reservations management"
        description="Review reservations, filter operational queues and inspect booking detail before admin action."
      />
      <div className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <AdminMetricCard
            label="Loaded"
            value={metrics.total}
            note="Admin list response rows."
            accent="brand"
          />
          <AdminMetricCard
            label="Force cancellable"
            value={metrics.forceCancelable}
            note="CONFIRMED or CHECKED_IN only."
            accent="warning"
          />
          <AdminMetricCard
            label="Admin cancelled"
            value={metrics.adminCancelled}
            note="CANCELLED_BY_ADMIN bookings."
            accent="danger"
          />
        </div>

        <AdminCard className="p-0">
          <AdminSectionHeader
            title="Reservation filters"
            description="Use precise filters for status, stay dates and identities. Search never creates holds or bookings."
            action={
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-[8px]"
                onClick={resetFilters}
              >
                Reset
              </Button>
            }
          />
          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
            <FieldLabel label="Status">
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  updateFilter("status", value as BookingStatus | "ALL")
                }
              >
                <SelectTrigger className="h-14 w-full rounded-full bg-white px-5">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "ALL" ? "All statuses" : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldLabel>
            <FieldLabel label="Check-in from">
              <Input
                type="date"
                value={filters.checkInFrom}
                onChange={(event) =>
                  updateFilter("checkInFrom", event.target.value)
                }
                className="h-14 rounded-[8px]"
              />
            </FieldLabel>
            <FieldLabel label="Check-in to">
              <Input
                type="date"
                value={filters.checkInTo}
                onChange={(event) =>
                  updateFilter("checkInTo", event.target.value)
                }
                className="h-14 rounded-[8px]"
              />
            </FieldLabel>
            <FieldLabel label="Booking code">
              <Input
                value={filters.bookingCode}
                onChange={(event) =>
                  updateFilter("bookingCode", event.target.value)
                }
                placeholder="Reservation code"
                className="h-14 rounded-[8px]"
              />
            </FieldLabel>
            <FieldLabel label="Guest">
              <Input
                value={filters.guest}
                onChange={(event) => updateFilter("guest", event.target.value)}
                placeholder="Guest name or id"
                className="h-14 rounded-[8px]"
              />
            </FieldLabel>
            <FieldLabel label="Host">
              <Input
                value={filters.host}
                onChange={(event) => updateFilter("host", event.target.value)}
                placeholder="Host name or id"
                className="h-14 rounded-[8px]"
              />
            </FieldLabel>
            <FieldLabel label="Listing">
              <Input
                value={filters.listing}
                onChange={(event) =>
                  updateFilter("listing", event.target.value)
                }
                placeholder="Listing title or id"
                className="h-14 rounded-[8px]"
              />
            </FieldLabel>
            <div className="flex items-end">
              <div className="flex h-14 w-full items-center gap-3 rounded-full border border-[#dddddd] bg-[#f7f7f7] px-5 text-sm text-[#6a6a6a]">
                <CalendarDays className="size-4 text-[#222222]" />
                Reservation lifecycle
              </div>
            </div>
          </div>
        </AdminCard>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <AdminCard className="p-0">
            <AdminSectionHeader
              title="Reservation queue"
              description="Open detail to review booking info, parties, payment, refunds and timeline."
            />
            <div className="p-5">
              {loading ? <AdminLoadingRows /> : null}
              {!loading && error ? (
                <AdminErrorState description={error} />
              ) : null}
              {!loading && !error && items.length === 0 ? (
                <AdminEmptyState
                  title="No reservations returned"
                  description="No rows matched the current filters, or the backend returned an empty admin reservation list."
                />
              ) : null}
              {!loading && !error && items.length > 0 ? (
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Booking</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stay</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow
                        key={item.bookingId}
                        className="border-[#eeeeee]"
                      >
                        <TableCell>
                          <p className="font-semibold text-[#222222]">
                            {getSummaryCode(item)}
                          </p>
                          <p className="text-xs text-[#6a6a6a]">
                            {item.listingTitle ?? item.listingId}
                          </p>
                        </TableCell>
                        <TableCell>
                          <BookingStatusPill status={item.status} />
                        </TableCell>
                        <TableCell className="max-w-[220px] whitespace-normal text-[#6a6a6a]">
                          {formatAdminDate(item.checkInDate)} -{" "}
                          {formatAdminDate(item.checkOutDate)}
                        </TableCell>
                        <TableCell>{item.guestName ?? item.guestId}</TableCell>
                        <TableCell>{item.hostName ?? item.hostId}</TableCell>
                        <TableCell>
                          {formatCurrency(item.totalAmount, item.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              className="h-9 rounded-[8px]"
                              onClick={() => openDetail(item)}
                            >
                              Detail
                            </Button>
                            <Button
                              variant="outline"
                              className="h-9 rounded-[8px]"
                              disabled={!canForceCancelStatus(item.status)}
                              onClick={() => setBookingId(item.bookingId)}
                            >
                              Use id
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard className="h-fit">
            <div className="rounded-[14px] border border-[#ebebeb] bg-[#f7f7f7] p-5">
              <p className="text-sm font-semibold text-[#222222]">
                Force cancellation
              </p>
              <p className="mt-2 text-sm leading-6 text-[#6a6a6a]">
                Available for eligible bookings. Backend remains the source of
                truth for final validation and refund cap.
              </p>
            </div>
            <div className="mt-5 space-y-4">
              <FieldLabel label="Booking id">
                <Input
                  value={bookingId}
                  onChange={(event) => setBookingId(event.target.value)}
                  placeholder="UUID"
                  className="h-14 rounded-[8px]"
                />
              </FieldLabel>
              <FieldLabel label="Reason">
                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="SAFETY, FRAUD, OPERATIONAL"
                  className="h-14 rounded-[8px]"
                />
              </FieldLabel>
              <FieldLabel label="Refund amount">
                <Input
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="Optional capped amount"
                  className="h-14 rounded-[8px]"
                />
              </FieldLabel>
              <FieldLabel label="Admin note">
                <Textarea
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  placeholder="Required audit note"
                  className="min-h-28 rounded-[8px]"
                />
              </FieldLabel>
              <Button
                onClick={submitForceCancel}
                disabled={!canSubmit || submitting}
                className="h-12 w-full rounded-[8px] bg-[#ff385c] text-white hover:bg-[#e00b41]"
              >
                {submitting ? "Submitting..." : "Force cancel booking"}
              </Button>
              {actionMessage ? (
                <p className="text-sm leading-6 text-[#6a6a6a]">
                  {actionMessage}
                </p>
              ) : null}
            </div>
          </AdminCard>
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto bg-white sm:max-w-3xl"
        >
          <SheetHeader className="border-b border-[#ebebeb]">
            <SheetTitle className="text-[22px] font-medium tracking-[-0.02em] text-[#222222]">
              {selected
                ? `Reservation ${getSummaryCode(selected)}`
                : "Reservation detail"}
            </SheetTitle>
            <SheetDescription>
              Reservation detail view for operational review.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 p-6">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <BookingStatusPill
                    status={detail?.status ?? selected.status}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-[8px]"
                      disabled={!canForceCancelStatus(selected.status)}
                      onClick={() => setBookingId(selected.bookingId)}
                    >
                      Force cancel
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-10 rounded-[8px]"
                    >
                      <Link
                        href={`/admin/refunds?bookingId=${selected.bookingId}`}
                      >
                        View refund records
                        <ExternalLink className="ml-2 size-3.5" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-10 rounded-[8px]"
                    >
                      <Link
                        href={`/admin/complaints?bookingId=${selected.bookingId}`}
                      >
                        View complaint
                        <ExternalLink className="ml-2 size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {detailLoading ? <AdminLoadingRows rows={3} /> : null}
                {!detailLoading && detailError ? (
                  <AdminErrorState
                    title="Detail endpoint placeholder"
                    description={detailError}
                  />
                ) : null}

                <section>
                  <h3 className="text-base font-semibold text-[#222222]">
                    Booking info
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <DetailLine label="Booking id" value={selected.bookingId} />
                    <DetailLine
                      label="Reservation code"
                      value={
                        detail?.reservationCode ?? selected.reservationCode
                      }
                    />
                    <DetailLine
                      label="Check-in"
                      value={formatAdminDate(
                        detail?.checkInDate ?? selected.checkInDate,
                      )}
                    />
                    <DetailLine
                      label="Check-out"
                      value={formatAdminDate(
                        detail?.checkOutDate ?? selected.checkOutDate,
                      )}
                    />
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <h3 className="text-base font-semibold text-[#222222]">
                      Guest
                    </h3>
                    <div className="mt-3 space-y-3">
                      <DetailLine
                        label="Name"
                        value={detail?.guest.name ?? selected.guestName}
                      />
                      <DetailLine
                        label="Id"
                        value={detail?.guest.id ?? selected.guestId}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#222222]">
                      Host
                    </h3>
                    <div className="mt-3 space-y-3">
                      <DetailLine
                        label="Name"
                        value={detail?.host.name ?? selected.hostName}
                      />
                      <DetailLine
                        label="Id"
                        value={detail?.host.id ?? selected.hostId}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#222222]">
                      Listing
                    </h3>
                    <div className="mt-3 space-y-3">
                      <DetailLine
                        label="Title"
                        value={detail?.listing.title ?? selected.listingTitle}
                      />
                      <DetailLine
                        label="Id"
                        value={detail?.listing.id ?? selected.listingId}
                      />
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <h3 className="text-base font-semibold text-[#222222]">
                      Payment summary
                    </h3>
                    <div className="mt-3 grid gap-3">
                      <DetailLine
                        label="Payment status"
                        value={
                          detail?.payment?.status ?? selected.paymentStatus
                        }
                      />
                      <DetailLine
                        label="Amount"
                        value={formatCurrency(
                          detail?.payment?.amount ?? selected.totalAmount,
                          detail?.payment?.currency ?? selected.currency,
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#222222]">
                      Refund summary
                    </h3>
                    <div className="mt-3 space-y-3">
                      {detail?.refunds?.length ? (
                        detail.refunds.map((refund) => (
                          <div
                            key={refund.refundId}
                            className="rounded-[14px] border border-[#ebebeb] bg-white p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-[#222222]">
                                {formatCurrency(refund.amount, refund.currency)}
                              </p>
                              <TextStatusPill
                                tone={
                                  refund.status === "COMPLETED"
                                    ? "success"
                                    : refund.status === "FAILED"
                                      ? "danger"
                                      : "warning"
                                }
                              >
                                {refund.status}
                              </TextStatusPill>
                            </div>
                            <p className="mt-2 text-xs text-[#6a6a6a]">
                              {refund.businessCause.replaceAll("_", " ")} /{" "}
                              {formatAdminDate(refund.createdAt)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <DetailLine
                          label="Refund records"
                          value="No refund summary returned yet"
                        />
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-base font-semibold text-[#222222]">
                    Timeline
                  </h3>
                  <div className="mt-4 space-y-4">
                    {timeline.map((item) => (
                      <div key={item.key} className="flex gap-3">
                        <span className="mt-1 size-2.5 rounded-full bg-[#ff385c]" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#222222]">
                            {item.label}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[#6a6a6a]">
                            {item.description ?? "No description"}
                          </p>
                          <p className="mt-1 text-xs text-[#929292]">
                            {formatAdminDate(item.occurredAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
