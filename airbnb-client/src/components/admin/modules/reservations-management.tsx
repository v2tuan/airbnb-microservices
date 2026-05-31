"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type AdminReservationSummary,
  forceCancelAdminBooking,
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

export function ReservationsManagementModule() {
  const { token } = useAdminToken();
  const [items, setItems] = useState<AdminReservationSummary[]>([]);
  const [status, setStatus] = useState<BookingStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState("");
  const [reason, setReason] = useState("OPERATIONAL");
  const [adminNote, setAdminNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listAdminReservations(token, {
      statuses: status === "ALL" ? undefined : [status],
      search,
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
            "GET /bookings/admin/reservations is not available yet. The manual force-cancel panel remains usable with a booking id.",
          ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, status, search]);

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
        description="Review V2 reservation state and force cancel only CONFIRMED or CHECKED_IN bookings. Completed and actor-cancelled states are terminal."
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <AdminCard className="p-0">
            <AdminSectionHeader
              title="Reservation queue"
              description="Filter by V2 lifecycle status and inspect records before taking admin action."
              action={
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as BookingStatus | "ALL")
                  }
                >
                  <SelectTrigger className="h-10 w-[220px] rounded-full bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === "ALL" ? "All V2 statuses" : option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <div className="p-5">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search booking, guest, host, listing"
                className="mb-5 h-14 rounded-full bg-[#f7f7f7] px-6"
              />

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
                <Table className="min-w-[920px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Booking</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stay</TableHead>
                      <TableHead>Guest / Host</TableHead>
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
                            {item.reservationCode ?? item.bookingId.slice(0, 8)}
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
                        <TableCell>
                          {item.guestName ?? item.guestId}
                          <span className="block text-xs text-[#6a6a6a]">
                            {item.hostName ?? item.hostId}
                          </span>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.totalAmount, item.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            className="rounded-full"
                            disabled={!canForceCancelStatus(item.status)}
                            onClick={() => setBookingId(item.bookingId)}
                          >
                            Use id
                          </Button>
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
                Backend validates eligibility. Use this panel when the list
                endpoint is unavailable or when operating from an incident id.
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
    </>
  );
}
