"use client";

import { isAxiosError } from "axios";
import {
  AlarmClock,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  HelpCircle,
  MessageCircle,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  cancelBooking,
  confirmCancellationQuote,
  createComplaint,
  getBookingDetail,
  requestCancellationQuote,
} from "@/api/endpoints/booking";
import { BookingStatusBadge } from "@/components/trips/BookingStatusBadge";
import { CancelReservationModal } from "@/components/trips/CancelReservationModal";
import { ExpiredReservationState } from "@/components/trips/ExpiredReservationState";
import { PaymentCountdownTimer } from "@/components/trips/PaymentCountdownTimer";
import { ReservationStatusBadge } from "@/components/trips/ReservationStatusBadge";
import { TripDetailSkeleton } from "@/components/trips/SkeletonLoader";
import { usePaymentCountdown } from "@/components/trips/usePaymentCountdown";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { RootState } from "@/store";
import { extractApiErrorMessage } from "@/types/api.type";
import type {
  BookingDetailResponse,
  BookingStatus,
  ComplaintType,
  GuestCancellationQuoteResponse,
} from "@/types/booking.type";

const fallbackImage = "/header/home.png";

function getApiErrorMessage(error: unknown) {
  if (!isAxiosError(error)) return null;

  const data = error.response?.data as
    | { message?: string; detail?: string; error?: string }
    | undefined;

  return data?.message ?? data?.detail ?? data?.error ?? null;
}

const complaintTypes: Array<{ value: ComplaintType; label: string }> = [
  { value: "CANNOT_CHECK_IN", label: "Cannot check in" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "UNCLEAN", label: "Unclean" },
  { value: "MISSING_AMENITY", label: "Missing amenity" },
  { value: "SAFETY_ISSUE", label: "Safety issue" },
];

function mapPaymentStatus(booking: BookingDetailResponse) {
  const stripeStatus = booking.payment?.stripePaymentStatus;
  if (stripeStatus === "PAID") return "paid";
  if (stripeStatus === "PAYMENT_FAILED" || stripeStatus === "REFUND_FAILED") {
    return "failed";
  }
  if (stripeStatus === "PAYMENT_CANCELLED") return "cancelled";
  if (
    stripeStatus === "REFUND_PENDING" ||
    stripeStatus === "PARTIALLY_REFUNDED" ||
    stripeStatus === "REFUNDED"
  ) {
    return "refunded";
  }
  if (booking.status === "PENDING_PAYMENT") return "pending";
  if (
    booking.status === "CANCELLED_BY_GUEST" ||
    booking.status === "CANCELLED_BY_HOST" ||
    booking.status === "CANCELLED_BY_ADMIN" ||
    booking.status === "EXPIRED"
  ) {
    return "cancelled";
  }
  return "paid";
}

function coverImage(booking: BookingDetailResponse) {
  return (
    booking.listing?.photos?.find((photo) => photo.isCover)?.photoUrl ??
    booking.listing?.photos?.[0]?.photoUrl ??
    fallbackImage
  );
}

function locationLabel(booking: BookingDetailResponse) {
  return [booking.listing?.city, booking.listing?.country]
    .filter(Boolean)
    .join(", ");
}

export default function ManageReservationPage() {
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const token = useSelector((state: RootState) => state.auth.token);
  const [booking, setBooking] = useState<BookingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [cancelRequestSent, setCancelRequestSent] = useState(false);
  const [cancellationQuote, setCancellationQuote] =
    useState<GuestCancellationQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [complaintType, setComplaintType] =
    useState<ComplaintType>("NOT_AS_DESCRIBED");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [complaintMessage, setComplaintMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchDetail() {
      if (!token) {
        setLoading(false);
        setError(true);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);
        const response = await getBookingDetail(token, params.bookingId);
        if (!cancelled) {
          setBooking(response.data);
          setNotes(response.data.guestNotes ?? "");
          setAdults(response.data.numAdults ?? 1);
          setChildren(response.data.numChildren ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch booking detail", err);
        if (!cancelled) {
          setError(true);
          setErrorMessage(extractApiErrorMessage(err, "This reservation does not exist or is not available for your account."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [params.bookingId, token]);

  const isPaymentPending = booking?.status === "PENDING_PAYMENT";
  const countdown = usePaymentCountdown(
    isPaymentPending ? booking?.expiresAt : undefined,
  );
  const isPaymentExpired = !!isPaymentPending && countdown.isExpired;
  const effectiveStatus: BookingStatus = isPaymentExpired
    ? "EXPIRED"
    : (booking?.status ?? "PENDING_PAYMENT");
  const paymentStatus = booking ? mapPaymentStatus(booking) : "pending";
  const expiresTime = booking?.expiresAt
    ? new Date(booking.expiresAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const totalAmount = useMemo(
    () => Number(booking?.payment?.totalAmount ?? 0),
    [booking],
  );
  const canCreateComplaint =
    booking?.status === "CHECKED_IN" &&
    booking.checkedInAt &&
    Date.now() - new Date(booking.checkedInAt).getTime() <=
      24 * 60 * 60 * 1000;

  const saveNotes = () => {
    setNotesSaved(true);
    window.setTimeout(() => setNotesSaved(false), 2000);
  };

  const loadCancellationQuote = async () => {
    if (!booking) return;

    try {
      setQuoteLoading(true);
      setQuoteError(null);
      const response = await requestCancellationQuote(token, booking.bookingId);
      setCancellationQuote(response.data);
    } catch (err) {
      console.error("Failed to load cancellation quote", err);
      setQuoteError(extractApiErrorMessage(err, "Could not calculate the cancellation quote. Try again."));
      setCancellationQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  const openCancellationModal = () => {
    setCancelOpen(true);
    setCancellationQuote(null);
    void loadCancellationQuote();
  };

  const handleCancelPendingHold = async () => {
    if (!booking) return;

    try {
      await cancelBooking(token, booking.bookingId, "Guest abandoned unpaid hold");
      setBooking((current) =>
        current
          ? {
              ...current,
              status: "EXPIRED",
              statusDisplayName: "Expired",
            }
          : current,
      );
      setCancelRequestSent(true);
    } catch (err) {
      console.error("Failed to expire pending booking", err);
      setQuoteError(extractApiErrorMessage(err, "Cancellation failed. Please try again."));
    }
  };

  const handleCancelReservation = async (reason: string, quoteId: string) => {
    if (!booking) return;

    try {
      setCancelSubmitting(true);
      await confirmCancellationQuote(token, booking.bookingId, quoteId, reason);
      setBooking((current) =>
        current
          ? {
              ...current,
              status: "CANCELLED_BY_GUEST",
              statusDisplayName: "Cancelled by guest",
            }
          : current,
      );
      setCancelRequestSent(true);
      setCancelOpen(false);
      setCancellationQuote(null);
    } catch (err) {
      console.error("Failed to cancel booking", err);
      setQuoteError(extractApiErrorMessage(err, "Cancellation failed. Request a new quote and try again."));
      setQuoteError(
        getApiErrorMessage(err) ??
          "Cancellation failed. Request a new quote and try again.",
      );
    } finally {
      setCancelSubmitting(false);
    }
  };

  const submitComplaint = async () => {
    if (!booking || !complaintDescription.trim()) return;

    try {
      setComplaintSubmitting(true);
      setComplaintMessage("");
      await createComplaint(token, booking.bookingId, {
        type: complaintType,
        description: complaintDescription.trim(),
      });
      setComplaintDescription("");
      setComplaintMessage("Complaint submitted. The host has 24 hours to respond.");
    } catch (err) {
      console.error("Failed to submit complaint", err);
      setComplaintMessage(extractApiErrorMessage(err, "Unable to submit complaint. You may already have an active complaint."));
    } finally {
      setComplaintSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf9]">
        <TripDetailSkeleton />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#fafaf9]">
        <main className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
            <h1 className="font-display text-2xl font-semibold text-slate-900">
              Booking not found
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              {errorMessage ?? "This reservation does not exist or is not available for your account."}
            </p>
            <Link
              href="/trips"
              className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white"
            >
              Back to trips
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href={`/trips/${booking.bookingId}`}
          className="group mb-6 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to trip details
        </Link>

        <div className="mb-8 flex animate-fade-in-up items-center gap-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl">
            <Image
              src={coverImage(booking)}
              alt={booking.listing?.title ?? "Trip"}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display mb-1 truncate text-xl font-semibold text-slate-900">
              {booking.listing?.title ?? "Trip"}
            </h1>
            <p className="text-sm text-slate-500">{locationLabel(booking)}</p>
            <div className="mt-2 flex items-center gap-2">
              <ReservationStatusBadge status={effectiveStatus} size="sm" />
              <span className="text-xs text-slate-400">
                #{booking.reservationCode}
              </span>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(totalAmount, booking.currency)}
            </p>
            <p className="text-xs text-slate-400">
              {paymentStatus === "pending" ? "Total due" : "Total paid"}
            </p>
          </div>
        </div>

        <div className="mb-8 animate-fade-in-up-delay-1">
          {isPaymentExpired ? (
            <ExpiredReservationState />
          ) : (
            <div
              className={`rounded-2xl border bg-white p-6 shadow-sm ${
                isPaymentPending ? "border-amber-100" : "border-slate-100"
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isPaymentPending
                        ? "bg-amber-50 text-amber-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    <AlarmClock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                      Payment status
                    </p>
                    <h2 className="font-display font-semibold text-slate-900">
                      {isPaymentPending
                        ? "Complete your payment"
                        : "Payment confirmed"}
                    </h2>
                  </div>
                </div>
                <BookingStatusBadge status={paymentStatus} size="sm" />
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-600">
                    {isPaymentPending
                      ? "Complete payment to confirm this reservation."
                      : "Your payment has been processed successfully."}
                  </p>
                  {isPaymentPending && expiresTime ? (
                    <p className="mt-1 text-xs text-slate-400">
                      Reservation hold ends at {expiresTime}.
                    </p>
                  ) : null}
                </div>
                {isPaymentPending ? (
                  <PaymentCountdownTimer
                    minutes={countdown.minutes}
                    seconds={countdown.seconds}
                    isCritical={countdown.isCritical}
                  />
                ) : null}
              </div>

              {isPaymentPending ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/checkout/${booking.listingId}`)
                    }
                    className="inline-flex justify-center rounded-full bg-rose-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600"
                  >
                    Complete payment
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="animate-fade-in-up-delay-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
                <Calendar className="h-4 w-4 text-rose-500" />
              </div>
              <h2 className="font-display font-semibold text-slate-900">
                Reservation dates
              </h2>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <p className="mb-2 text-xs font-medium tracking-wider text-slate-500 uppercase">
                  Check-in
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(booking.checkInDate)}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium tracking-wider text-slate-500 uppercase">
                  Check-out
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(booking.checkOutDate)}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="w-full rounded-xl border border-rose-200 py-2.5 text-sm font-medium text-rose-600 transition-all hover:border-rose-300 hover:bg-rose-50"
            >
              Request date change
            </button>
          </div>

          <div className="animate-fade-in-up-delay-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <h2 className="font-display font-semibold text-slate-900">
                Guest information
              </h2>
            </div>
            <div className="mb-4 space-y-4">
              {[
                {
                  label: "Adults",
                  value: adults,
                  set: setAdults,
                  min: 1,
                  max: 8,
                },
                {
                  label: "Children",
                  value: children,
                  set: setChildren,
                  min: 0,
                  max: 6,
                },
              ].map(({ label, value, set, min, max }) => (
                <div key={label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {label}
                    </p>
                    <p className="text-xs text-slate-400">
                      {label === "Adults" ? "Age 13+" : "Ages 2-12"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => set(Math.max(min, value - 1))}
                      disabled={value <= min}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-slate-400 disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="w-4 text-center font-semibold text-slate-900">
                      {value}
                    </span>
                    <button
                      type="button"
                      onClick={() => set(Math.min(max, value + 1))}
                      disabled={value >= max}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-slate-400 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="w-full rounded-xl border border-blue-200 py-2.5 text-sm font-medium text-blue-600 transition-all hover:border-blue-300 hover:bg-blue-50"
            >
              Update guests
            </button>
          </div>

          <div className="animate-fade-in-up-delay-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <CreditCard className="h-4 w-4 text-emerald-500" />
              </div>
              <h2 className="font-display font-semibold text-slate-900">
                Payment method
              </h2>
            </div>
            <div className="mb-4 flex items-center gap-4 rounded-xl bg-slate-50 p-4">
              <div className="flex h-8 w-12 items-center justify-center rounded-lg border border-slate-100 bg-white shadow-sm">
                <span className="text-xs font-bold text-slate-700">ST</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Stripe payment
                </p>
                <p className="text-xs text-slate-500">
                  {booking.payment?.stripePaymentStatus ?? "Pending"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span className="text-sm text-slate-600">Total charged</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(totalAmount, booking.currency)}
              </span>
            </div>
          </div>

          <div className="animate-fade-in-up-delay-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                <FileText className="h-4 w-4 text-amber-500" />
              </div>
              <h2 className="font-display font-semibold text-slate-900">
                Trip notes
              </h2>
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add personal notes, packing lists, reminders..."
              className="mb-3 h-28 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 transition-all focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
            <button
              type="button"
              onClick={saveNotes}
              className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all ${
                notesSaved
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {notesSaved ? "Saved" : "Save notes"}
            </button>
          </div>

          <div className="animate-fade-in-up-delay-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50">
                <HelpCircle className="h-4 w-4 text-purple-500" />
              </div>
              <h2 className="font-display font-semibold text-slate-900">
                Support
              </h2>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/guest/messages?hostId=${booking.host?.keycloakUserId ?? booking.hostId ?? ""}`,
                  )
                }
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-50"
              >
                <MessageCircle className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Message {booking.host?.fullName ?? "host"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Usually responds within a few hours
                  </p>
                </div>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-50"
              >
                <HelpCircle className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Get help from support
                  </p>
                  <p className="text-xs text-slate-400">
                    24/7 customer support
                  </p>
                </div>
              </button>
            </div>
          </div>

          {canCreateComplaint ? (
            <div className="animate-fade-in-up-delay-3 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-slate-900">
                    Report a check-in issue
                  </h2>
                  <p className="text-xs text-slate-500">
                    Available within 24 hours after check-in.
                  </p>
                </div>
              </div>
              <select
                value={complaintType}
                onChange={(event) =>
                  setComplaintType(event.target.value as ComplaintType)
                }
                className="mb-3 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-700 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
              >
                {complaintTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <textarea
                value={complaintDescription}
                onChange={(event) => setComplaintDescription(event.target.value)}
                placeholder="Describe the issue and include any evidence links if needed."
                className="mb-3 h-28 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
              <button
                type="button"
                onClick={submitComplaint}
                disabled={complaintSubmitting || !complaintDescription.trim()}
                className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:bg-amber-200"
              >
                {complaintSubmitting ? "Submitting..." : "Submit complaint"}
              </button>
              {complaintMessage ? (
                <p className="mt-3 text-sm font-medium text-slate-600">
                  {complaintMessage}
                </p>
              ) : null}
            </div>
          ) : null}

          {!isPaymentExpired &&
          (booking.status === "CONFIRMED" ||
            booking.status === "PENDING_PAYMENT") ? (
            <div className="animate-fade-in-up-delay-3 rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <h2 className="font-display font-semibold text-slate-900">
                  Cancel reservation
                </h2>
              </div>
              <p className="mb-4 text-sm text-slate-500">
                {booking.cancellationPolicy?.description}
              </p>
              <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-sm text-slate-600">Potential refund</span>
                <span
                  className={`font-bold ${
                    booking.cancellationPolicy?.refundable
                      ? "text-emerald-600"
                      : "text-red-500"
                  }`}
                >
                  {booking.cancellationPolicy?.refundable
                    ? formatCurrency(totalAmount, booking.currency)
                    : "No refund"}
                </span>
              </div>
              <button
                type="button"
                onClick={
                  booking.status === "PENDING_PAYMENT"
                    ? handleCancelPendingHold
                    : openCancellationModal
                }
                className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50"
              >
                Cancel this reservation
              </button>
              {quoteError && !cancelOpen ? (
                <p className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {quoteError}
                </p>
              ) : null}
              {cancelRequestSent ? (
                <p className="mt-3 text-sm font-medium text-emerald-600">
                  Reservation cancelled.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>

      <CancelReservationModal
        isOpen={cancelOpen}
        policy={booking.cancellationPolicy}
        payment={booking.payment}
        quote={cancellationQuote}
        quoteLoading={quoteLoading}
        quoteError={quoteError}
        submitting={cancelSubmitting}
        onClose={() => setCancelOpen(false)}
        onRetryQuote={loadCancellationQuote}
        onConfirm={handleCancelReservation}
      />
    </div>
  );
}
