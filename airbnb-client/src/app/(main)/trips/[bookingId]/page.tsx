"use client";

import { isAxiosError } from "axios";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  CreditCard,
  DoorOpen,
  ExternalLink,
  FileText,
  Grid3X3,
  Hash,
  Home,
  Info,
  Key,
  MapPin,
  Navigation,
  PawPrint,
  Settings,
  Star,
  Users,
  Wifi,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  cancelBooking,
  confirmCancellationQuote,
  getBookingDetail,
  requestCancellationQuote,
} from "@/api/endpoints/booking";
import { CancelReservationModal } from "@/components/trips/CancelReservationModal";
import { ExpiredReservationState } from "@/components/trips/ExpiredReservationState";
import { GalleryModal } from "@/components/trips/GalleryModal";
import { HostCard } from "@/components/trips/HostCard";
import { PaymentSummaryCard } from "@/components/trips/PaymentSummaryCard";
import { PendingPaymentBanner } from "@/components/trips/PendingPaymentBanner";
import { ReservationStatusBadge } from "@/components/trips/ReservationStatusBadge";
import { ReviewCard } from "@/components/trips/ReviewCard";
import { TripDetailSkeleton } from "@/components/trips/SkeletonLoader";
import { TripTimeline } from "@/components/trips/TripTimeline";
import { usePaymentCountdown } from "@/components/trips/usePaymentCountdown";
import { formatDate, getNights } from "@/lib/utils";
import type { RootState } from "@/store";
import { extractApiErrorMessage } from "@/types/api.type";
import type {
  BookingDetailResponse,
  BookingStatus,
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

const amenityIcons: Record<string, string> = {
  Pool: "🏊",
  WiFi: "📶",
  Kitchen: "🍳",
  "Air conditioning": "❄️",
  Washer: "🌀",
  "Free parking": "🅿️",
  "Hot tub": "🛁",
  "BBQ grill": "🔥",
  "Ocean view": "🌊",
  Breakfast: "☕",
  "Beach access": "🏖️",
  Surfboard: "🏄",
  Bike: "🚲",
  Balcony: "🌿",
  "City view": "🏙️",
  "Coffee maker": "☕",
  Gym: "💪",
  Concierge: "🛎️",
  "Mountain view": "⛰️",
  Fireplace: "🔥",
  Sauna: "♨️",
  "Ski-in/ski-out": "⛷️",
};

function asNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTime(value?: string | null, fallback = "Time not provided") {
  if (!value) return fallback;
  return value.slice(0, 5);
}

function formatDateTime(value?: string | null, fallback = "Not available") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatOptional(
  value?: string | number | null,
  fallback = "Not provided",
) {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatType(value?: string | null) {
  return value ? value.replaceAll("_", " ").toLowerCase() : "Not provided";
}

function yesNo(value?: boolean | null) {
  if (value === null || value === undefined) return "Not provided";
  return value ? "Allowed" : "Not allowed";
}

function getAddress(booking: BookingDetailResponse) {
  const listing = booking.listing;
  if (!listing) return "";

  return [
    listing.address,
    listing.city,
    listing.state,
    listing.country,
    listing.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

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

function getDirectionsQuery(booking: BookingDetailResponse) {
  const lat = asNumber(booking.listing?.latitude);
  const lng = asNumber(booking.listing?.longitude);
  return lat && lng ? `${lat},${lng}` : getAddress(booking);
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="mb-1 text-xs font-medium tracking-wider text-slate-500 uppercase">
        {label}
      </p>
      <div className="break-words text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function RuleItem({ label, value }: { label: string; value: string }) {
  const isBlocked = value === "Not allowed";
  const isMissing = value === "Not provided";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 text-sm font-medium ${
          isBlocked ? "text-red-500" : "text-slate-900"
        }`}
      >
        {isMissing ? null : isBlocked ? (
          <X className="h-3.5 w-3.5" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        {value}
      </span>
    </div>
  );
}

export default function BookingDetailPage() {
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const token = useSelector((state: RootState) => state.auth.token);

  const [booking, setBooking] = useState<BookingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [hostMsgSent, setHostMsgSent] = useState(false);
  const [cancelRequestSent, setCancelRequestSent] = useState(false);
  const [cancellationQuote, setCancellationQuote] =
    useState<GuestCancellationQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

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
        setError(false);
        setErrorMessage(null);
        const response = await getBookingDetail(token, params.bookingId);
        if (!cancelled) setBooking(response.data);
      } catch (err) {
        console.error("Failed to fetch booking detail", err);
        if (!cancelled) {
          setError(true);
          setErrorMessage(
            extractApiErrorMessage(
              err,
              "This reservation does not exist or is not available for your account.",
            ),
          );
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

  const address = useMemo(
    () => (booking ? getAddress(booking) : ""),
    [booking],
  );
  const images = useMemo(() => {
    const urls =
      booking?.listing?.photos
        ?.map((photo) => photo.photoUrl)
        .filter((url): url is string => !!url) ?? [];
    return urls.length > 0 ? urls : [fallbackImage];
  }, [booking]);

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
              {errorMessage ??
                "This reservation does not exist or is not available for your account."}
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

  const listing = booking.listing;
  const hostName = booking.host?.fullName ?? "Host";
  const nights = getNights(booking.checkInDate, booking.checkOutDate);
  const totalGuests =
    (booking.numAdults ?? 0) +
    (booking.numChildren ?? 0) +
    (booking.numInfants ?? 0);
  const showManage =
    !isPaymentExpired &&
    (booking.status === "CONFIRMED" || booking.status === "PENDING_PAYMENT");
  const directionsQuery = getDirectionsQuery(booking);
  const directionsUrl = `https://maps.google.com/?q=${encodeURIComponent(directionsQuery)}`;
  const checkInTime = formatTime(
    listing?.checkInStartTime ?? listing?.houseRules?.checkInFrom,
    "After host check-in time",
  );
  const checkOutTime = formatTime(
    listing?.checkOutTime ?? listing?.houseRules?.checkOutTime,
    "Before host check-out time",
  );
  const amenities = listing?.amenities ?? [];
  const rating = Number(booking.reviewSummary?.averageRating ?? 4.8).toFixed(2);
  const reviewCount = booking.reviewSummary?.reviewCount ?? 0;
  const paymentStatus = mapPaymentStatus(booking);
  const guestBreakdown = [
    { label: "Adults", value: booking.numAdults ?? 0 },
    { label: "Children", value: booking.numChildren ?? 0 },
    { label: "Infants", value: booking.numInfants ?? 0 },
    { label: "Pets", value: booking.numPets ?? 0 },
  ];
  const listingFacts = [
    {
      label: "Property type",
      value: formatType(listing?.propertyType),
    },
    {
      label: "Room type",
      value: formatType(listing?.roomType),
    },
    {
      label: "Bedrooms",
      value: listing?.numBedrooms ?? "Not provided",
    },
    {
      label: "Beds",
      value: listing?.numBeds ?? "Not provided",
    },
    {
      label: "Bathrooms",
      value: listing?.numBathrooms ?? "Not provided",
    },
    {
      label: "Max guests",
      value: listing?.maxGuests ?? "Not provided",
    },
  ];
  const timelineItems = [
    { label: "Booked on", value: formatDateTime(booking.createdAt) },
    {
      label:
        booking.status === "PENDING_PAYMENT" ? "Payment due" : "Hold expires",
      value: formatDateTime(booking.expiresAt),
    },
    { label: "Paid at", value: formatDateTime(booking.paidAt) },
    { label: "Checked in at", value: formatDateTime(booking.checkedInAt) },
    { label: "Checked out at", value: formatDateTime(booking.checkedOutAt) },
    { label: "Completed at", value: formatDateTime(booking.completedAt) },
  ];
  const houseRules = listing?.houseRules;
  const guideSteps = booking.accessInfo?.checkInGuide ?? [];

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  const handlePayNow = () => {
    const query = new URLSearchParams({
      checkin: booking.checkInDate,
      checkout: booking.checkOutDate,
      numberOfAdults: String(booking.numAdults),
      numberOfChildren: String(booking.numChildren),
      numberOfInfants: String(booking.numInfants),
      numberOfPets: String(booking.numPets),
      guestCurrency: booking.currency,
      bookingId: booking.bookingId,
    });

    router.push(`/checkout/${booking.listingId}?${query.toString()}`);
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
      setQuoteError(
        extractApiErrorMessage(
          err,
          "Could not calculate the cancellation quote. Try again.",
        ),
      );
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

  const handleAbandonPendingHold = async () => {
    if (!booking) return;

    try {
      await cancelBooking(
        token,
        booking.bookingId,
        "Guest abandoned unpaid hold",
      );
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
      setQuoteError(
        extractApiErrorMessage(err, "Cancellation failed. Please try again."),
      );
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
      setQuoteError(
        extractApiErrorMessage(
          err,
          "Cancellation failed. Request a new quote and try again.",
        ),
      );
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 animate-fade-in-up">
          <Link
            href="/trips"
            className="group mb-5 inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to trips
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 className="font-display text-3xl text-slate-900 sm:text-4xl">
                  {listing?.title ?? "Trip details"}
                </h1>
                <ReservationStatusBadge status={effectiveStatus} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-slate-500">
                <MapPin className="h-4 w-4 text-rose-400" />
                <span>{address || "Address not available"}</span>
                <span className="text-slate-300">-</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{rating}</span>
                  <span className="text-slate-400">
                    ({reviewCount} reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {showManage ? (
                <Link
                  href={`/trips/${booking.bookingId}/manage`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-white hover:text-slate-900"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Manage
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {isPaymentPending ? (
          <div className="sticky top-20 z-30 mb-6">
            {isPaymentExpired ? (
              <ExpiredReservationState />
            ) : (
              <PendingPaymentBanner
                minutes={countdown.minutes}
                seconds={countdown.seconds}
                isCritical={countdown.isCritical}
                expiresAt={booking.expiresAt}
                onPayNow={handlePayNow}
                onCancel={handleAbandonPendingHold}
              />
            )}
            {quoteError && !cancelOpen ? (
              <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">
                {quoteError}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mb-10 grid h-72 animate-fade-in-up-delay-1 grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-96">
          <button
            type="button"
            className="group relative col-span-2 row-span-2 cursor-pointer"
            onClick={() => openGallery(0)}
          >
            <Image
              src={images[0]}
              alt={listing?.title ?? "Property photo"}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="50vw"
              priority
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
          </button>
          {images.slice(1, 5).map((image, index) => (
            <button
              type="button"
              key={image}
              className="group relative cursor-pointer overflow-hidden"
              onClick={() => openGallery(index + 1)}
            >
              <Image
                src={image}
                alt={`${listing?.title ?? "Property"} ${index + 2}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="25vw"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              {index === 3 && images.length > 5 ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="flex items-center gap-1.5 font-semibold text-white">
                    <Grid3X3 className="h-4 w-4" />+{images.length - 4} more
                  </span>
                </div>
              ) : null}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="animate-fade-in-up-delay-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                  <Hash className="h-4 w-4 text-slate-700" />
                </div>
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  Reservation details
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wider text-slate-500 uppercase">
                    <Calendar className="h-3.5 w-3.5" />
                    Check-in
                  </div>
                  <p className="text-base font-semibold text-slate-900">
                    {formatDate(booking.checkInDate)}
                  </p>
                  <p className="text-sm text-slate-500">{checkInTime}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wider text-slate-500 uppercase">
                    <Calendar className="h-3.5 w-3.5" />
                    Check-out
                  </div>
                  <p className="text-base font-semibold text-slate-900">
                    {formatDate(booking.checkOutDate)}
                  </p>
                  <p className="text-sm text-slate-500">{checkOutTime}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wider text-slate-500 uppercase">
                    <Users className="h-3.5 w-3.5" />
                    Guests
                  </div>
                  <p className="text-base font-semibold text-slate-900">
                    {totalGuests} guests
                  </p>
                  <p className="text-sm text-slate-500">{nights} nights</p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <PawPrint className="h-4 w-4 text-rose-400" />
                  Guest breakdown
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {guestBreakdown.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl bg-slate-50 p-3"
                    >
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
                {booking.guestNotes ? (
                  <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <FileText className="h-4 w-4 text-slate-500" />
                      Guest notes
                    </div>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {booking.guestNotes}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Info className="h-4 w-4 text-slate-500" />
                  Full address
                </div>
                <p className="text-sm text-slate-600">
                  {address || "Address not available"}
                </p>
              </div>
            </div>

            {effectiveStatus !== "EXPIRED" &&
            effectiveStatus !== "CANCELLED_BY_GUEST" &&
            effectiveStatus !== "CANCELLED_BY_HOST" &&
            effectiveStatus !== "CANCELLED_BY_ADMIN" ? (
              <div className="animate-fade-in-up-delay-2 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-orange-50 p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500">
                    <Key className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-display font-semibold text-slate-900">
                    Check-in instructions
                  </h3>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-xl bg-white/70 p-4">
                    <Wifi className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        WiFi password
                      </p>
                      <p className="font-mono text-sm font-semibold text-slate-800">
                        {booking.accessInfo?.wifiPassword ?? "Not shared yet"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-white/70 p-4">
                    <DoorOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Entry code
                      </p>
                      <p className="font-mono text-sm font-semibold text-slate-800">
                        {booking.accessInfo?.entryCode ?? "Not shared yet"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {booking.accessInfo?.smartLockInstructions ? (
                    <div className="rounded-xl bg-white/70 p-4">
                      <p className="text-xs font-medium text-slate-500">
                        Smart lock
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">
                        {booking.accessInfo.smartLockInstructions}
                      </p>
                    </div>
                  ) : null}
                  {booking.accessInfo?.keyPickupInstructions ? (
                    <div className="rounded-xl bg-white/70 p-4">
                      <p className="text-xs font-medium text-slate-500">
                        Key pickup
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">
                        {booking.accessInfo.keyPickupInstructions}
                      </p>
                    </div>
                  ) : null}
                  {guideSteps.length > 0 ? (
                    <div className="rounded-xl bg-white/70 p-4">
                      <p className="mb-3 text-xs font-medium text-slate-500">
                        Arrival guide
                      </p>
                      <div className="space-y-3">
                        {guideSteps.map((step) => (
                          <div
                            key={`${step.stepNumber}-${step.title}`}
                            className="flex gap-3"
                          >
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-semibold text-white">
                              {step.stepNumber}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {step.title}
                              </p>
                              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-white/70 p-4 text-sm text-slate-600">
                      Your host will share detailed check-in instructions before
                      arrival.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="animate-fade-in-up-delay-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="font-display mb-4 text-lg font-semibold text-slate-900">
                What this place offers
              </h3>
              {amenities.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {amenities.map((amenity) => (
                    <div
                      key={amenity.amenityId ?? amenity.name}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <span className="text-lg">
                        {amenityIcons[amenity.name ?? ""] || "✓"}
                      </span>
                      <span>{amenity.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Amenities are not available for this listing yet.
                </p>
              )}
            </div>

            <div className="animate-fade-in-up-delay-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="font-display mb-4 text-lg font-semibold text-slate-900">
                House rules
              </h3>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DetailItem
                  label="Check-in from"
                  value={formatTime(
                    houseRules?.checkInFrom ?? listing?.checkInStartTime,
                    "Not provided",
                  )}
                />
                <DetailItem
                  label="Check-in until"
                  value={formatTime(
                    houseRules?.checkInTo ?? listing?.checkInEndTime,
                    "Not provided",
                  )}
                />
                <DetailItem
                  label="Check-out"
                  value={formatTime(
                    houseRules?.checkOutTime ?? listing?.checkOutTime,
                    "Not provided",
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <RuleItem
                  label="Smoking"
                  value={yesNo(houseRules?.smokingAllowed)}
                />
                <RuleItem label="Pets" value={yesNo(houseRules?.petsAllowed)} />
                <RuleItem
                  label="Parties"
                  value={yesNo(houseRules?.partiesAllowed)}
                />
                <RuleItem
                  label="Children"
                  value={yesNo(houseRules?.childrenAllowed)}
                />
              </div>
              {houseRules?.additionalRules ? (
                <p className="mt-4 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                  {houseRules.additionalRules}
                </p>
              ) : null}
            </div>

            <div className="animate-fade-in-up-delay-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Location
                </h3>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-500 hover:text-rose-600"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Get directions
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="relative flex h-52 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200">
                <iframe
                  title="Trip location"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(directionsQuery)}&output=embed`}
                  className="absolute inset-0 h-full w-full border-0 opacity-70"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="pointer-events-none relative text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500 shadow-lg shadow-rose-300">
                    <MapPin className="h-6 w-6 fill-white text-white" />
                  </div>
                  <p className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm">
                    {address || "Location"}
                  </p>
                </div>
              </div>
            </div>

            <div className="animate-fade-in-up-delay-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="font-display mb-3 text-lg font-semibold text-slate-900">
                Cancellation policy
              </h3>
              <div className="flex items-start gap-3">
                <div
                  className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${
                    booking.cancellationPolicy?.refundable
                      ? "bg-emerald-400"
                      : "bg-red-400"
                  }`}
                />
                <div>
                  <p className="font-medium text-slate-800">
                    {booking.cancellationPolicy?.type ?? "Policy unavailable"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {booking.cancellationPolicy?.description}
                  </p>
                </div>
              </div>
              {!isPaymentExpired &&
              booking.status === "CONFIRMED" &&
              booking.cancellationPolicy?.refundable ? (
                <button
                  type="button"
                  onClick={openCancellationModal}
                  className="mt-4 font-medium text-sm text-rose-500 underline underline-offset-2 transition-colors hover:text-rose-600"
                >
                  Cancel this reservation
                </button>
              ) : null}
              {cancelRequestSent ? (
                <p className="mt-3 text-sm font-medium text-emerald-600">
                  Reservation cancelled.
                </p>
              ) : null}
            </div>

            {effectiveStatus === "COMPLETED" ? (
              <div className="animate-fade-in-up-delay-4">
                <ReviewCard hostName={hostName} bookingId={booking.bookingId} />
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="animate-fade-in-up-delay-2">
              <TripTimeline
                checkIn={booking.checkInDate}
                checkOut={booking.checkOutDate}
                status={effectiveStatus}
                checkedInAt={booking.checkedInAt}
                checkedOutAt={booking.checkedOutAt}
                completedAt={booking.completedAt}
              />
            </div>
            <div className="animate-fade-in-up-delay-3">
              <HostCard
                host={booking.host}
                onContact={() => {
                  setHostMsgSent(true);
                  router.push(
                    `/guest/messages?hostId=${booking.host?.keycloakUserId ?? booking.hostId ?? ""}`,
                  );
                }}
              />
              {hostMsgSent ? (
                <p className="mt-2 text-center text-sm font-medium text-emerald-600">
                  Message opened for {hostName}
                </p>
              ) : null}
            </div>
            <div className="animate-fade-in-up-delay-4">
              <PaymentSummaryCard
                payment={booking.payment}
                paymentStatus={paymentStatus}
                checkIn={booking.checkInDate}
                checkOut={booking.checkOutDate}
              />
            </div>
          </div>
        </div>
      </main>

      <GalleryModal
        images={images}
        title={listing?.title ?? "Property photos"}
        isOpen={galleryOpen}
        initialIndex={galleryIndex}
        onClose={() => setGalleryOpen(false)}
      />

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
