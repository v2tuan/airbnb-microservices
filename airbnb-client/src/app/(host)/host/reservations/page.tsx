"use client";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Home,
  Inbox,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { getHostReservations } from "@/api/endpoints/booking";
import {
  type ApiResponse as ListingApiResponse,
  type ListingItemResponse,
  type ListingResponse,
  listingAPI,
  type PageResponse,
  unwrapApiData,
} from "@/api/endpoints/listing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authStorage } from "@/lib/auth-storage";
import { hasRealmRole, parseJwt } from "@/lib/jwt";
import { cn, formatCurrency } from "@/lib/utils";
import type { RootState } from "@/store";
import type {
  BookingStatus,
  HostReservationResponse,
  HostReservationStats,
} from "@/types/booking.type";

type StatusFilterKey =
  | "ALL"
  | "NEEDS_ATTENTION"
  | "UPCOMING"
  | "IN_STAY"
  | "PAST_STAY"
  | "CANCELLED";

type ListingOption = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  city?: string;
  country?: string;
  shortFeatures?: string;
};

type LoadStatus = "idle" | "loading" | "success" | "error";

/**
 * State của danh sách listing phải giữ cả `status` và `items` trong cùng một object.
 * Mục tiêu: phân biệt rõ "chưa tải xong" với "đã tải xong nhưng không có listing",
 * tránh dashboard render nhầm số 0 hoặc empty state trước khi API resolve.
 */
type ListingsState = {
  status: LoadStatus;
  items: ListingOption[];
};

const ALL_LISTINGS_ID = "__all_listings__";
const PAGE_SIZE = 8;
const fallbackImage = "/header/home.png";
const metricSkeletonKeys = [
  "metric-1",
  "metric-2",
  "metric-3",
  "metric-4",
  "metric-5",
];
const listingSkeletonKeys = [
  "listing-1",
  "listing-2",
  "listing-3",
  "listing-4",
  "listing-5",
];
const reservationSkeletonKeys = [
  "reservation-1",
  "reservation-2",
  "reservation-3",
  "reservation-4",
  "reservation-5",
  "reservation-6",
  "reservation-7",
  "reservation-8",
];
const calendarSkeletonKeys = Array.from(
  { length: 35 },
  (_, index) => `calendar-${index + 1}`,
);
const nextStaySkeletonKeys = ["next-1", "next-2", "next-3", "next-4"];

/**
 * Skeleton shimmer dùng chung cho toàn bộ reservation management.
 * Component này giữ nguyên kích thước layout thật, chỉ thay nội dung bằng khối shimmer
 * để người dùng không thấy spinner trống hoặc layout bị nhảy trong lúc fetch dữ liệu.
 */
function Shimmer({
  className,
  rounded = "rounded-[14px]",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <Skeleton
      className={cn(
        "relative overflow-hidden bg-[#f2f2f2]",
        rounded,
        className,
      )}
    >
      <span
        className="absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent"
        style={{ animation: "airbnb-shimmer 1.8s ease-in-out infinite" }}
      />
    </Skeleton>
  );
}

function ShimmerStyles() {
  return (
    <style>{`
      @keyframes airbnb-shimmer {
        100% {
          transform: translateX(220%);
        }
      }
    `}</style>
  );
}

const statusViews: Array<{
  key: StatusFilterKey;
  label: string;
  statuses?: BookingStatus[];
}> = [
  { key: "ALL", label: "All" },
  {
    key: "NEEDS_ATTENTION",
    label: "Needs attention",
    statuses: ["PENDING_PAYMENT"],
  },
  { key: "UPCOMING", label: "Upcoming", statuses: ["CONFIRMED"] },
  { key: "IN_STAY", label: "In stay", statuses: ["CHECKED_IN"] },
  { key: "PAST_STAY", label: "Past stays", statuses: ["COMPLETED"] },
  {
    key: "CANCELLED",
    label: "Cancelled",
    statuses: [
      "CANCELLED_BY_GUEST",
      "CANCELLED_BY_HOST",
      "CANCELLED_BY_ADMIN",
      "EXPIRED",
    ],
  },
];

/**
 * Chuẩn hóa nhiều dạng response listing về một shape nhỏ mà dashboard cần dùng.
 * Trang này chỉ dành cho host, nhưng API listing của host vẫn có thể trả về 2 dạng:
 * - PageResponse<ListingItemResponse>: dữ liệu phân trang, thường dùng cho màn danh sách.
 * - ApiResponse<ListingResponse[]> hoặc ListingResponse[]: dữ liệu listing đầy đủ hơn ở một số flow cũ.
 * Vì UI chỉ cần vài trường chung, hàm này gom các dạng đó về `ListingOption`
 * để phần render/filter không phải biết backend đang trả shape nào.
 */
const emptyStats: HostReservationStats = {
  total: 0,
  pending: 0,
  arrivalsToday: 0,
  inHouse: 0,
  revenue: 0,
  currency: "USD",
};

const emptyStatusCounts: Record<StatusFilterKey, number> = {
  ALL: 0,
  NEEDS_ATTENTION: 0,
  UPCOMING: 0,
  IN_STAY: 0,
  PAST_STAY: 0,
  CANCELLED: 0,
};

function isRequestCanceled(error: unknown) {
  const candidate = error as { code?: string; name?: string } | undefined;
  return (
    candidate?.code === "ERR_CANCELED" || candidate?.name === "CanceledError"
  );
}

function toCalendarDates(values: string[]) {
  return values.map((value) => new Date(`${value}T00:00:00`));
}

function normalizeListings(payload: unknown): ListingOption[] {
  type ListingsPayload =
    | ListingApiResponse<ListingResponse[]>
    | ListingResponse[]
    | PageResponse<ListingItemResponse>;

  const source = unwrapApiData(payload as ListingsPayload) as
    | ListingResponse[]
    | PageResponse<ListingItemResponse>;

  if (Array.isArray(source)) {
    return source.map((listing: ListingResponse) => ({
      id: listing.listingId,
      title: listing.title,
      thumbnailUrl:
        listing.photos?.find((photo) => photo.isCover)?.photoUrl ??
        listing.photos?.[0]?.photoUrl,
      city: listing.city,
      country: listing.country,
      shortFeatures: `${listing.numBeds ?? 0} beds - ${listing.maxGuests ?? 0} guests`,
    }));
  }

  const page = source as {
    content?: ListingItemResponse[];
    items?: ListingItemResponse[];
  };

  return (page.content ?? page.items ?? []).map((listing) => ({
    id: listing.id,
    title: listing.title,
    thumbnailUrl: listing.thumbnailUrl,
    city: listing.city,
    shortFeatures: listing.shortFeatures,
  }));
}

function listingPageTotalPages(payload: unknown) {
  const source = unwrapApiData(
    payload as
      | ListingApiResponse<ListingResponse[]>
      | ListingResponse[]
      | PageResponse<ListingItemResponse>,
  ) as ListingResponse[] | PageResponse<ListingItemResponse>;

  if (Array.isArray(source)) {
    return 1;
  }

  return Math.max(1, source.totalPages ?? 1);
}

/**
 * Tải đủ listing option để dropdown và listing carousel không bị thiếu.
 *
 * Production issue đang xử lý:
 * - Listing API là paginated. Nếu chỉ gọi page 0 size 72, host có listing thứ 73 sẽ không xuất hiện
 *   trong filter, card carousel và scope consistency check của màn reservation.
 * - Reservation data đã aggregate ở backend, nhưng UI vẫn cần danh sách listing đầy đủ để host chọn scope.
 * - Loop này dừng theo `totalPages` backend trả về và có guard 200 page để tránh vòng lặp vô hạn nếu API
 *   trả metadata sai.
 */
async function loadAllHostListingOptions(hostId: string) {
  const size = 100;
  const firstResponse = await listingAPI.getListingsByHost(hostId, {
    page: 0,
    size,
  });
  const items = normalizeListings(firstResponse.data);
  const totalPages = listingPageTotalPages(firstResponse.data);

  for (
    let nextPage = 1;
    nextPage < totalPages && nextPage < 200;
    nextPage += 1
  ) {
    const response = await listingAPI.getListingsByHost(hostId, {
      page: nextPage,
      size,
    });
    items.push(...normalizeListings(response.data));
  }

  return items;
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateRange(checkIn: string, checkOut: string) {
  const end = new Date(`${checkOut}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formatShortDate(checkIn)} - ${end}`;
}

function toFilterDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

function toFilterDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatFilterDate(value: string) {
  const date = toFilterDate(value);

  if (!date) return "Pick a date";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatGuestName(reservation: HostReservationResponse) {
  return reservation.guest?.fullName || "Guest";
}

function guestInitial(reservation: HostReservationResponse) {
  return formatGuestName(reservation).slice(0, 1).toUpperCase();
}

function guestCount(reservation: HostReservationResponse) {
  return (
    (reservation.numAdults ?? 0) +
    (reservation.numChildren ?? 0) +
    (reservation.numInfants ?? 0)
  );
}

function reservationImage(reservation: HostReservationResponse) {
  return reservation.listingCoverImageUrl || fallbackImage;
}

function listingLocation(listing?: ListingOption) {
  return [listing?.city, listing?.country].filter(Boolean).join(", ");
}

function paymentStatusMeta(reservation: HostReservationResponse) {
  if (reservation.status === "PENDING_PAYMENT") {
    return {
      label: "Awaiting payment",
      className: "border-[#c13515]/20 bg-[#fff8f6] text-[#c13515]",
    };
  }

  if (
    ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED"].includes(
      reservation.status,
    )
  ) {
    return {
      label: "Paid",
      className: "border-[#dddddd] bg-white text-[#222222]",
    };
  }

  if (
    reservation.status === "CANCELLED_BY_GUEST" ||
    reservation.status === "CANCELLED_BY_HOST" ||
    reservation.status === "CANCELLED_BY_ADMIN"
  ) {
    return {
      label: reservation.paidAt ? "Refund review" : "Not charged",
      className: "border-[#dddddd] bg-[#f7f7f7] text-[#6a6a6a]",
    };
  }

  return {
    label: "Expired",
    className: "border-[#dddddd] bg-[#f7f7f7] text-[#6a6a6a]",
  };
}

function parseDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateAtTime(dateValue: string, time: string) {
  return new Date(`${dateValue}T${time}:00`);
}

function scheduledCheckInAt(reservation: HostReservationResponse) {
  return (
    parseDateTime(reservation.scheduledCheckInAt) ??
    dateAtTime(reservation.checkInDate, "15:00")
  );
}

function scheduledCheckOutAt(reservation: HostReservationResponse) {
  return (
    parseDateTime(reservation.scheduledCheckOutAt) ??
    dateAtTime(reservation.checkOutDate, "11:00")
  );
}

function reservationPhaseMeta(reservation: HostReservationResponse) {
  if (reservation.status === "PENDING_PAYMENT") {
    return {
      label: "Pending payment",
      className: "border-[#c13515]/20 bg-[#fff8f6] text-[#c13515]",
    };
  }

  if (reservation.status === "EXPIRED") {
    return {
      label: "Expired",
      className: "border-[#dddddd] bg-[#f7f7f7] text-[#6a6a6a]",
    };
  }

  if (
    reservation.status === "CANCELLED_BY_GUEST" ||
    reservation.status === "CANCELLED_BY_HOST" ||
    reservation.status === "CANCELLED_BY_ADMIN"
  ) {
    return {
      label: "Cancelled",
      className: "border-[#c13515]/20 bg-[#fff8f6] text-[#c13515]",
    };
  }

  const now = new Date();
  const checkInAt = scheduledCheckInAt(reservation);
  const checkOutAt = scheduledCheckOutAt(reservation);

  if (now < checkInAt) {
    return {
      label: "Upcoming",
      className: "border-[#dddddd] bg-white text-[#222222]",
    };
  }

  if (now < checkOutAt) {
    return {
      label: "In stay",
      className: "border-[#0f766e]/20 bg-[#f0fdfa] text-[#0f766e]",
    };
  }

  return {
    label: "Past stay",
    className: "border-[#dddddd] bg-[#f7f7f7] text-[#3f3f3f]",
  };
}

function ReservationPhaseBadge({
  reservation,
}: {
  reservation: HostReservationResponse;
}) {
  const phase = reservationPhaseMeta(reservation);

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold",
        phase.className,
      )}
    >
      {phase.label}
    </span>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[14px] border border-[#dddddd] bg-white p-4">
      <div className="mb-3 flex size-8 items-center justify-center rounded-full bg-[#f2f2f2] text-[#222222]">
        {icon}
      </div>
      <p className="text-[22px] font-semibold leading-[1.18] tracking-[-0.44px] text-[#222222]">
        {value}
      </p>
      <p className="mt-1 text-sm leading-[1.43] text-[#6a6a6a]">{label}</p>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="rounded-[14px] border border-[#dddddd] bg-white p-4">
      <Shimmer className="mb-3 size-8" rounded="rounded-full" />
      <Shimmer className="h-7 w-16" rounded="rounded-lg" />
      <Shimmer className="mt-2 h-4 w-28" rounded="rounded-lg" />
    </div>
  );
}

/**
 * Avatar ưu tiên ảnh thật của guest, fallback sang chữ cái đầu.
 * Đây là component nhỏ nhưng được dùng ở list và sidebar nên tách riêng để UI nhất quán.
 */
function GuestAvatar({
  reservation,
  size = "md",
}: {
  reservation: HostReservationResponse;
  size?: "sm" | "md";
}) {
  const dimensions = size === "sm" ? "size-9" : "size-11";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-[#f2f2f2] text-sm font-semibold text-[#222222]",
        dimensions,
      )}
    >
      {reservation.guest?.avatarUrl ? (
        <Image
          src={reservation.guest.avatarUrl}
          alt={formatGuestName(reservation)}
          fill
          className="object-cover"
          sizes={size === "sm" ? "36px" : "44px"}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {guestInitial(reservation)}
        </div>
      )}
    </div>
  );
}

function ListingCard({
  listing,
  selected,
  onSelect,
}: {
  listing: ListingOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group min-w-[180px] text-left"
    >
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-[14px] border bg-[#f7f7f7]",
          selected ? "border-[#222222]" : "border-transparent",
        )}
      >
        <Image
          src={listing.thumbnailUrl || fallbackImage}
          alt={listing.title}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="180px"
        />
      </div>
      <p className="mt-3 line-clamp-1 text-base font-semibold leading-[1.25] text-[#222222]">
        {listing.title}
      </p>
      <p className="mt-0.5 line-clamp-1 text-sm leading-[1.43] text-[#6a6a6a]">
        {listingLocation(listing) || listing.shortFeatures || "Listing"}
      </p>
    </button>
  );
}

function ListingCardSkeleton() {
  return (
    <div className="min-w-[180px]">
      <Shimmer className="aspect-square w-full" />
      <Shimmer className="mt-3 h-5 w-36" rounded="rounded-lg" />
      <Shimmer className="mt-2 h-4 w-28" rounded="rounded-lg" />
    </div>
  );
}

function DateFilterButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = toFilterDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`Select ${label.toLowerCase()} date`}
          className="h-12 w-full justify-start rounded-2xl border-[#dddddd] bg-white px-4 text-left hover:bg-[#f7f7f7]"
        >
          <CalendarDays className="size-4 text-[#6a6a6a]" />
          <span
            className={cn(
              "min-w-0 truncate text-sm leading-[1.43]",
              value ? "text-[#222222]" : "text-[#6a6a6a]",
            )}
          >
            {formatFilterDate(value)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            onChange(date ? toFilterDateValue(date) : "");
            setOpen(false);
          }}
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Clear {label.toLowerCase()}
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Card reservation là đơn vị chính của list: ảnh listing, guest, status, payment, ngày ở và tổng tiền.
 * Click card đi thẳng vào detail để host xem phase vận hành và xử lý hủy nếu cần.
 */
function ReservationCard({
  reservation,
}: {
  reservation: HostReservationResponse;
}) {
  const payment = paymentStatusMeta(reservation);
  const phase = reservationPhaseMeta(reservation);

  return (
    <Link
      href={`/host/reservations/${reservation.reservationId}`}
      className="group grid gap-4 rounded-[14px] border border-[#dddddd] bg-white p-4 transition hover:shadow-[rgba(0,0,0,0.02)_0_0_0_1px,rgba(0,0,0,0.04)_0_2px_6px_0,rgba(0,0,0,0.1)_0_4px_8px_0] md:grid-cols-[168px_minmax(0,1fr)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-[#f7f7f7] md:aspect-auto">
        <Image
          src={reservationImage(reservation)}
          alt={reservation.listingTitle || "Reservation"}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 168px"
        />
        {reservation.status === "CONFIRMED" ? (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#222222] shadow-[rgba(0,0,0,0.02)_0_0_0_1px,rgba(0,0,0,0.04)_0_2px_6px_0,rgba(0,0,0,0.1)_0_4px_8px_0]">
            {phase.label}
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <GuestAvatar reservation={reservation} />
            <div className="min-w-0">
              <p className="line-clamp-1 text-base font-semibold leading-[1.25] text-[#222222]">
                {formatGuestName(reservation)}
              </p>
              <p className="mt-0.5 text-sm leading-[1.43] text-[#6a6a6a]">
                {reservation.reservationCode}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <ReservationPhaseBadge reservation={reservation} />
            <span
              className={cn(
                "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold",
                payment.className,
              )}
            >
              {payment.label}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold leading-[1.33] text-[#222222]">
              Dates
            </p>
            <p className="mt-1 text-sm leading-[1.43] text-[#3f3f3f]">
              {formatDateRange(
                reservation.checkInDate,
                reservation.checkOutDate,
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold leading-[1.33] text-[#222222]">
              Guests
            </p>
            <p className="mt-1 text-sm leading-[1.43] text-[#3f3f3f]">
              {guestCount(reservation)} guests
              {reservation.numPets ? `, ${reservation.numPets} pets` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold leading-[1.33] text-[#222222]">
              Total
            </p>
            <p className="mt-1 text-sm font-semibold leading-[1.43] text-[#222222]">
              {formatCurrency(reservation.totalAmount, reservation.currency)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#ebebeb] pt-4">
          <p className="line-clamp-1 text-sm leading-[1.43] text-[#6a6a6a]">
            {reservation.listingTitle ?? "Listing"}
            {reservation.listingCity ? ` in ${reservation.listingCity}` : ""}
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[#222222]">
            Details
            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Skeleton của card giữ đúng cấu trúc 2 cột của card thật: ảnh, guest, badge, dates và total.
 * Việc giữ layout này là phần quan trọng để không có flash "Not found" hoặc layout shift khi API đang fetch.
 */
function ReservationCardSkeleton() {
  return (
    <div className="grid gap-4 rounded-[14px] border border-[#dddddd] bg-white p-4 md:grid-cols-[168px_minmax(0,1fr)]">
      <Shimmer className="aspect-[4/3] md:aspect-auto md:min-h-[164px]" />
      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Shimmer className="size-11 shrink-0" rounded="rounded-full" />
            <div className="min-w-0 flex-1">
              <Shimmer className="h-5 w-40 max-w-full" rounded="rounded-lg" />
              <Shimmer className="mt-2 h-4 w-28" rounded="rounded-lg" />
            </div>
          </div>
          <div className="flex gap-2">
            <Shimmer className="h-6 w-24" rounded="rounded-full" />
            <Shimmer className="h-6 w-20" rounded="rounded-full" />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item}>
              <Shimmer className="h-4 w-14" rounded="rounded-lg" />
              <Shimmer className="mt-2 h-4 w-28" rounded="rounded-lg" />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#ebebeb] pt-4">
          <Shimmer className="h-4 w-48 max-w-[60%]" rounded="rounded-lg" />
          <Shimmer className="h-4 w-16" rounded="rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-5 w-20" rounded="rounded-lg" />
        <Shimmer className="h-5 w-20" rounded="rounded-lg" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {calendarSkeletonKeys.map((key) => (
          <Shimmer key={key} className="aspect-square" rounded="rounded-full" />
        ))}
      </div>
    </div>
  );
}

function NextStaySkeleton() {
  return (
    <div className="flex gap-3">
      <Shimmer className="size-9 shrink-0" rounded="rounded-full" />
      <div className="min-w-0 flex-1">
        <Shimmer className="h-4 w-32" rounded="rounded-lg" />
        <Shimmer className="mt-2 h-4 w-44 max-w-full" rounded="rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Dashboard quản lý reservation chỉ dành cho HOST.
 *
 * Flow tổng quát:
 * 1. Lấy token từ Redux và localStorage để tránh hard reload bị render như anonymous.
 * 2. Chỉ cho user có realm role HOST đi tiếp; admin không còn được xử lý ở trang này.
 * 3. Tải danh sách listing thuộc host hiện tại bằng `hostId` lấy từ JWT.
 * 4. Khi đã biết scope listing, gọi API reservation cho một listing hoặc gom toàn bộ listing của host.
 * 5. Trong lúc API chưa resolve, chỉ render skeleton đúng layout; không render nhầm số 0/empty state.
 * 6. Filter, stats, calendar và pagination đều tính từ `scopedReservations` đã xác nhận đúng scope.
 */
export default function HostReservationsPage() {
  const router = useRouter();
  const reduxToken = useSelector((state: RootState) => state.auth.token);
  const [storageToken, setStorageToken] = useState<string | null>(null);
  const [authStorageChecked, setAuthStorageChecked] = useState(false);
  const [selectedListingId, setSelectedListingId] =
    useState<string>(ALL_LISTINGS_ID);
  const [listingsState, setListingsState] = useState<ListingsState>({
    status: "loading",
    items: [],
  });
  const [reservations, setReservations] = useState<HostReservationResponse[]>(
    [],
  );
  const [reservationTotal, setReservationTotal] = useState(0);
  const [reservationPageCount, setReservationPageCount] = useState(1);
  const [stats, setStats] = useState<HostReservationStats>(emptyStats);
  const [statusCounts, setStatusCounts] =
    useState<Record<StatusFilterKey, number>>(emptyStatusCounts);
  const [calendarDates, setCalendarDates] = useState<Date[]>([]);
  const [nextReservations, setNextReservations] = useState<
    HostReservationResponse[]
  >([]);
  const [filter, setFilter] = useState<StatusFilterKey>("ALL");
  const [appliedFilter, setAppliedFilter] = useState<StatusFilterKey>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedListingId, setAppliedListingId] =
    useState<string>(ALL_LISTINGS_ID);
  const [page, setPage] = useState(1);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [loadedReservationScope, setLoadedReservationScope] = useState<
    string | null
  >(null);
  const reservationRequestId = useRef(0);

  // Redux auth được hydrate từ localStorage sau lần render đầu của client.
  // Đọc thêm token trực tiếp từ authStorage giúp hard reload không bị một frame "chưa đăng nhập",
  // vốn là nguyên nhân làm dashboard từng flash số 0/empty state trước khi dữ liệu thật về.
  const effectiveToken = reduxToken ?? storageToken;
  const isHost = useMemo(
    () => !!effectiveToken && hasRealmRole(effectiveToken, "HOST"),
    [effectiveToken],
  );
  const hostId = useMemo(
    () => (effectiveToken ? parseJwt(effectiveToken)?.sub : undefined),
    [effectiveToken],
  );
  const listings = listingsState.items;
  const loadingListings = listingsState.status === "loading";
  const listingsResolved =
    listingsState.status === "success" || listingsState.status === "error";

  // Reservation luôn gắn với "scope" đang chọn.
  // - Scope một listing: chính là listingId.
  // - Scope "All listings": phải kèm danh sách listing id hiện tại.
  // Nếu chỉ dùng key "__all_listings__", lần render đầu có thể fetch khi listing còn rỗng,
  // sau đó response rỗng bị hiểu nhầm là dữ liệu thật dù listing của host vừa load xong.
  const listingIdsKey = useMemo(
    () => listings.map((listing) => listing.id).join("|"),
    [listings],
  );
  const buildReservationQueryKey = (
    listingId: string,
    statusFilter: StatusFilterKey,
    fromDate: string,
    toDate: string,
    keyword: string,
    pageNumber: number,
  ) =>
    [
      listingId === ALL_LISTINGS_ID
        ? `${ALL_LISTINGS_ID}:${listingIdsKey}`
        : listingId,
      statusFilter,
      fromDate,
      toDate,
      keyword.trim(),
      pageNumber,
    ].join("|");
  const selectedReservationQueryKey = buildReservationQueryKey(
    appliedListingId,
    appliedFilter,
    appliedDateFrom,
    appliedDateTo,
    appliedSearch,
    page,
  );
  const scopedReservations =
    loadedReservationScope === selectedReservationQueryKey ? reservations : [];
  const selectedScopeHasData =
    loadedReservationScope === selectedReservationQueryKey;
  const showListingSkeleton = loadingListings && listings.length === 0;

  // Không render số 0 hoặc empty state khi scope reservation chưa resolve.
  // Trạng thái chưa resolve phải hiển thị skeleton với đúng kích thước layout thật để tránh flicker/layout shift.
  const showReservationSkeleton =
    !selectedScopeHasData ||
    (loadingReservations && scopedReservations.length === 0);

  useEffect(() => {
    const syncStorageToken = () => {
      setStorageToken(authStorage.getAccessToken());
      setAuthStorageChecked(true);
    };

    syncStorageToken();
    window.addEventListener("auth-token-refreshed", syncStorageToken);

    return () => {
      window.removeEventListener("auth-token-refreshed", syncStorageToken);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const listingId = new URLSearchParams(window.location.search).get(
      "listingId",
    );
    if (listingId) {
      setSelectedListingId(listingId);
      setAppliedListingId(listingId);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      if (!authStorageChecked) return;

      if (!effectiveToken || !isHost || !hostId) {
        setListingsState({ status: "idle", items: [] });
        return;
      }

      // Giữ status và items trong cùng object để tránh render trung gian sai nghĩa.
      // Ví dụ không mong muốn: status đã là "success" nhưng items vẫn là [] trong một frame,
      // làm UI tưởng host không có listing và hiện empty state trước khi API trả dữ liệu thật.
      setListingsState((current) => ({
        status: "loading",
        items: current.items,
      }));
      setError("");
      try {
        const items = await loadAllHostListingOptions(hostId);

        if (!cancelled) {
          setListingsState({
            status: "success",
            items,
          });
        }
      } catch {
        if (!cancelled) {
          setListingsState((current) => ({
            status: "error",
            items: current.items,
          }));
          setError("Unable to load listings.");
        }
      }
    }

    void loadListings();

    return () => {
      cancelled = true;
    };
  }, [authStorageChecked, effectiveToken, hostId, isHost]);

  const currentView =
    statusViews.find((option) => option.key === appliedFilter) ??
    statusViews[0];

  const loadReservations = useCallback(
    async (signal?: AbortSignal) => {
      if (!authStorageChecked) return;

      if (!effectiveToken || !isHost || !appliedListingId) {
        setReservations([]);
        setReservationTotal(0);
        setReservationPageCount(1);
        setStats(emptyStats);
        setStatusCounts(emptyStatusCounts);
        setCalendarDates([]);
        setNextReservations([]);
        setLoadingReservations(false);
        setLoadedReservationScope(null);
        return;
      }

      if (appliedListingId === ALL_LISTINGS_ID && !listingsResolved) return;

      // Chỉ được kết luận host không có listing/reservation sau khi request listing đã resolve.
      // Trước thời điểm đó, `listings.length === 0` chỉ có nghĩa là "chưa tải xong",
      // không phải "host không có listing".
      if (
        appliedListingId === ALL_LISTINGS_ID &&
        listingsState.status === "success" &&
        listings.length === 0
      ) {
        setReservations([]);
        setReservationTotal(0);
        setReservationPageCount(1);
        setStats(emptyStats);
        setStatusCounts(emptyStatusCounts);
        setCalendarDates([]);
        setNextReservations([]);
        setLastSyncedAt(new Date());
        setLoadedReservationScope(selectedReservationQueryKey);
        setLoadingReservations(false);
        return;
      }

      const requestId = reservationRequestId.current + 1;
      reservationRequestId.current = requestId;
      const requestScope = selectedReservationQueryKey;

      setLoadingReservations(true);
      setError("");
      try {
        // Bỏ qua response cũ nếu host đổi listing trong lúc request trước còn pending.
        // Ví dụ: request All đang chạy, host bấm sang Listing A, response All về sau.
        // Nếu không guard bằng requestId, dữ liệu All sẽ ghi đè lên màn Listing A.
        const response = await getHostReservations(
          effectiveToken,
          {
            listingId:
              appliedListingId === ALL_LISTINGS_ID
                ? undefined
                : appliedListingId,
            statuses: currentView.statuses,
            search: appliedSearch.trim(),
            dateFrom: appliedDateFrom || undefined,
            dateTo: appliedDateTo || undefined,
            page: Math.max(0, page - 1),
            size: PAGE_SIZE,
          },
          signal,
        );
        // Guard tương tự cho request một listing cụ thể.
        // Chỉ request mới nhất được quyền cập nhật state hiển thị.
        if (reservationRequestId.current !== requestId) return;
        const data = response.data;
        const nextPageCount = Math.max(1, data?.totalPages ?? 1);

        /*
         * Backend pagination là nguồn truth. Nếu user đang ở page 5 nhưng filter/search mới chỉ còn
         * 2 page, giữ page 5 sẽ render empty state sai dù vẫn có reservation ở page hợp lệ.
         * Clamp page rồi để effect fetch lại page đúng; không set content rỗng của page vượt range.
         */
        if (page > nextPageCount) {
          setReservationPageCount(nextPageCount);
          setPage(nextPageCount);
          return;
        }

        setReservations(data?.content ?? []);
        setReservationTotal(data?.totalElements ?? 0);
        setReservationPageCount(nextPageCount);
        setStats(data?.stats ?? emptyStats);
        setStatusCounts({
          ...emptyStatusCounts,
          ...data?.statusCounts,
        });
        setCalendarDates(toCalendarDates(data?.occupiedDates ?? []));
        setNextReservations(data?.nextReservations ?? []);
        setLastSyncedAt(new Date());
        setLoadedReservationScope(requestScope);
      } catch (error) {
        if (isRequestCanceled(error)) return;
        if (reservationRequestId.current !== requestId) return;
        setError("Unable to load reservations.");
        setReservations([]);
        setReservationTotal(0);
        setReservationPageCount(1);
        setStats(emptyStats);
        setStatusCounts(emptyStatusCounts);
        setCalendarDates([]);
        setNextReservations([]);
        setLoadedReservationScope(requestScope);
      } finally {
        if (reservationRequestId.current === requestId) {
          setLoadingReservations(false);
        }
      }
    },
    [
      listingsResolved,
      listingsState.status,
      appliedListingId,
      selectedReservationQueryKey,
      currentView.statuses,
      appliedSearch,
      appliedDateFrom,
      appliedDateTo,
      page,
      authStorageChecked,
      effectiveToken,
      isHost,
      listings.length,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadReservations(controller.signal);

    return () => {
      // Hủy request cũ khi query đổi hoặc component unmount.
      // Stale guard chỉ chặn state update; abort còn tránh lãng phí network/backend.
      controller.abort();
    };
  }, [loadReservations]);

  const selectedListing = listings.find(
    (listing) => listing.id === appliedListingId,
  );
  const filteredReservations = scopedReservations;
  const paginatedReservations = scopedReservations;
  const pageCount = reservationPageCount;
  const currentPage = Math.min(page, pageCount);

  const handleSelectListing = (listingId: string) => {
    if (listingId === appliedListingId && listingId === selectedListingId)
      return;

    // Đổi listing phải vô hiệu hóa request đang chạy trước khi đổi UI scope.
    // Scope mới sẽ render skeleton cho đến khi request của chính nó resolve, không dùng dữ liệu scope cũ.
    const nextQueryKey = buildReservationQueryKey(
      listingId,
      appliedFilter,
      appliedDateFrom,
      appliedDateTo,
      appliedSearch,
      1,
    );
    setSelectedListingId(listingId);
    setAppliedListingId(listingId);
    setPage(1);
    if (nextQueryKey !== loadedReservationScope) {
      reservationRequestId.current += 1;
      setLoadingReservations(true);
    }
    router.replace(
      listingId === ALL_LISTINGS_ID
        ? "/host/reservations"
        : `/host/reservations?listingId=${listingId}`,
      { scroll: false },
    );
  };

  const handleStatusTabChange = (value: StatusFilterKey) => {
    const nextQueryKey = buildReservationQueryKey(
      appliedListingId,
      value,
      appliedDateFrom,
      appliedDateTo,
      appliedSearch,
      1,
    );

    setFilter(value);
    setAppliedFilter(value);
    setPage(1);
    if (nextQueryKey !== loadedReservationScope) {
      reservationRequestId.current += 1;
      setLoadingReservations(true);
    }
  };

  const clearFilters = () => {
    setFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setSelectedListingId(ALL_LISTINGS_ID);
  };

  const applyFilters = () => {
    const nextSearch = search.trim();
    const nextQueryKey = buildReservationQueryKey(
      selectedListingId,
      filter,
      dateFrom,
      dateTo,
      nextSearch,
      1,
    );

    setAppliedFilter(filter);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setAppliedSearch(nextSearch);
    setAppliedListingId(selectedListingId);
    setSearch(nextSearch);
    setPage(1);
    if (nextQueryKey !== loadedReservationScope) {
      reservationRequestId.current += 1;
      setLoadingReservations(true);
    }
    router.replace(
      selectedListingId === ALL_LISTINGS_ID
        ? "/host/reservations"
        : `/host/reservations?listingId=${selectedListingId}`,
      { scroll: false },
    );
  };

  const activeFilterCount = [
    appliedFilter !== "ALL",
    appliedListingId !== ALL_LISTINGS_ID,
    Boolean(appliedDateFrom),
    Boolean(appliedDateTo),
    Boolean(appliedSearch.trim()),
  ].filter(Boolean).length;
  const draftFilterCount = [
    filter !== "ALL",
    selectedListingId !== ALL_LISTINGS_ID,
    Boolean(dateFrom),
    Boolean(dateTo),
    Boolean(search.trim()),
  ].filter(Boolean).length;
  const hasPendingFilterChanges =
    filter !== appliedFilter ||
    selectedListingId !== appliedListingId ||
    dateFrom !== appliedDateFrom ||
    dateTo !== appliedDateTo ||
    search.trim() !== appliedSearch.trim();

  if (authStorageChecked && !effectiveToken) {
    return (
      <main className="min-h-[calc(100vh-96px)] bg-white px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-[14px] border border-[#dddddd] bg-white p-8 text-[#3f3f3f]">
          Please log in to manage reservations.
        </div>
      </main>
    );
  }

  if (authStorageChecked && effectiveToken && !isHost) {
    return (
      <main className="min-h-[calc(100vh-96px)] bg-white px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-[14px] border border-[#dddddd] bg-white p-8">
          <p className="text-[22px] font-medium leading-[1.18] tracking-[-0.44px] text-[#222222]">
            Only hosts can manage reservations
          </p>
          <p className="mt-2 text-base leading-[1.5] text-[#3f3f3f]">
            Finish host onboarding to review guest stays and reservation phases.
          </p>
          <Link
            href="/host/become"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-[#ff385c] px-6 text-base font-medium text-white transition active:bg-[#e00b41]"
          >
            Become a host
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-96px)] bg-white pb-16 text-[#222222]">
      <ShimmerStyles />
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
        <header className="border-b border-[#ebebeb] pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium leading-[1.29] text-[#6a6a6a]">
                Hosting
              </p>
              <h1 className="mt-2 text-[28px] font-bold leading-[1.43] text-[#222222]">
                Reservations
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-[1.5] text-[#3f3f3f]">
                Review guest stays, payment state, dates, and stay phases
                across your listings.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void loadReservations()}
                disabled={loadingReservations}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#222222] bg-white px-5 text-base font-medium text-[#222222] transition hover:bg-[#f7f7f7] disabled:opacity-60"
              >
                <RefreshCw
                  className={cn(
                    "size-4",
                    loadingReservations ? "animate-pulse" : "",
                  )}
                />
                Refresh
              </button>
              <Link
                href="/host/listings"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-[#ff385c] px-6 text-base font-medium text-white transition active:bg-[#e00b41]"
              >
                Manage listings
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {showReservationSkeleton ? (
              metricSkeletonKeys.map((key) => <MetricSkeleton key={key} />)
            ) : (
              <>
                <Metric
                  icon={<CalendarDays className="size-4" />}
                  label="Reservations"
                  value={stats.total}
                />
                <Metric
                  icon={<AlertCircle className="size-4" />}
                  label="Pending payment"
                  value={stats.pending}
                />
                <Metric
                  icon={<Users className="size-4" />}
                  label="Arrivals today"
                  value={stats.arrivalsToday}
                />
                <Metric
                  icon={<Home className="size-4" />}
                  label="In-house"
                  value={stats.inHouse}
                />
                <Metric
                  icon={<CircleDollarSign className="size-4" />}
                  label="Booked value"
                  value={formatCurrency(stats.revenue, stats.currency)}
                />
              </>
            )}
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-[14px] border border-[#c13515]/20 bg-[#fff8f6] p-4 text-sm font-medium text-[#c13515]">
            {error}
          </div>
        ) : null}

        <div className="mt-8">
          <div className="rounded-[28px] border border-[#dddddd] bg-white p-4 shadow-[rgba(0,0,0,0.02)_0_0_0_1px,rgba(0,0,0,0.04)_0_2px_6px_0,rgba(0,0,0,0.1)_0_4px_8px_0]">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold leading-[1.43] text-[#222222]">
                  Search and filters
                </p>
                <p className="text-sm leading-[1.43] text-[#6a6a6a]">
                  Set filters first, then press Search to update results.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasPendingFilterChanges ? (
                  <Badge
                    variant="outline"
                    className="border-[#ff385c]/20 bg-[#fff8f6] text-[#c13515]"
                  >
                    Unsaved changes
                  </Badge>
                ) : null}
                {activeFilterCount > 0 ? (
                  <Badge
                    variant="outline"
                    className="border-[#dddddd] bg-[#f7f7f7] text-[#3f3f3f]"
                  >
                    {activeFilterCount} active
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_230px_180px_180px_118px_118px]">
              <div className="block">
                <label
                  htmlFor="host-reservation-search"
                  className="mb-2 block text-xs font-bold leading-[1.33] text-[#222222]"
                >
                  Search
                </label>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#6a6a6a]" />
                  <Input
                    id="host-reservation-search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyFilters();
                      }
                    }}
                    placeholder="Guest, code, city"
                    className="h-12 rounded-2xl border-[#dddddd] bg-white pl-10 text-sm text-[#222222] placeholder:text-[#6a6a6a]"
                  />
                </span>
              </div>

              <div className="block">
                <span className="mb-2 block text-xs font-bold leading-[1.33] text-[#222222]">
                  Listing
                </span>
                <Select
                  value={selectedListingId}
                  onValueChange={setSelectedListingId}
                  disabled={showListingSkeleton}
                >
                  <SelectTrigger className="h-12 w-full rounded-2xl border-[#dddddd] bg-white px-4">
                    <SelectValue placeholder="All listings" />
                  </SelectTrigger>
                  <SelectContent position="popper" align="start">
                    <SelectItem value={ALL_LISTINGS_ID}>
                      All listings
                    </SelectItem>
                    {listings.map((listing) => (
                      <SelectItem key={listing.id} value={listing.id}>
                        {listing.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="mb-2 block text-xs font-bold leading-[1.33] text-[#222222]">
                  From
                </span>
                <DateFilterButton
                  label="From"
                  value={dateFrom}
                  onChange={(value) => {
                    setDateFrom(value);
                  }}
                />
              </div>

              <div>
                <span className="mb-2 block text-xs font-bold leading-[1.33] text-[#222222]">
                  To
                </span>
                <DateFilterButton
                  label="To"
                  value={dateTo}
                  onChange={(value) => {
                    setDateTo(value);
                  }}
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={applyFilters}
                  disabled={!hasPendingFilterChanges}
                  className="h-12 w-full rounded-2xl bg-[#ff385c] text-white hover:bg-[#e00b41]"
                >
                  <Search className="size-4" />
                  Search
                </Button>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={clearFilters}
                  disabled={draftFilterCount === 0}
                  variant="outline"
                  className="h-12 w-full rounded-2xl border-[#dddddd] bg-white text-[#222222] hover:bg-[#f7f7f7]"
                >
                  <SlidersHorizontal className="size-4" />
                  Reset
                </Button>
              </div>
            </div>
          </div>

          <Tabs
            value={filter}
            onValueChange={(value) =>
              handleStatusTabChange(value as StatusFilterKey)
            }
            className="mt-6"
          >
            <div className="h-10 border-b border-[#dddddd]">
              <TabsList
                variant="line"
                className="h-11 w-max justify-start gap-6 rounded-none p-0"
              >
                {statusViews.map((view) => (
                  <TabsTrigger
                    key={view.key}
                    value={view.key}
                    className="flex-none rounded-none px-0 pb-0 text-[#6a6a6a] data-active:text-[#222222]"
                  >
                    {view.label}
                    {showReservationSkeleton ? (
                      <Shimmer
                        className="ml-1.5 inline-block h-4 w-6 align-middle"
                        rounded="rounded-full"
                      />
                    ) : (
                      <Badge
                        variant="outline"
                        className="ml-1.5 h-5 border-transparent bg-[#f7f7f7] px-2 text-[11px] text-[#6a6a6a]"
                      >
                        {statusCounts[view.key] ?? 0}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[22px] font-medium leading-[1.18] tracking-[-0.44px] text-[#222222]">
                  {appliedListingId === ALL_LISTINGS_ID
                    ? "All listings"
                    : (selectedListing?.title ?? "Selected listing")}
                </h2>
                {showReservationSkeleton ? (
                  <Shimmer className="mt-3 h-4 w-48" rounded="rounded-lg" />
                ) : (
                  <p className="mt-2 text-sm leading-[1.43] text-[#6a6a6a]">
                    {reservationTotal} reservations
                    {lastSyncedAt
                      ? ` - synced ${lastSyncedAt.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : ""}
                  </p>
                )}
              </div>
            </div>

            {showListingSkeleton ? (
              <div className="mb-8 flex gap-4 overflow-x-auto pb-2">
                {listingSkeletonKeys.map((key) => (
                  <ListingCardSkeleton key={key} />
                ))}
              </div>
            ) : listings.length > 0 ? (
              <div className="mb-8 flex gap-4 overflow-x-auto pb-2">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    selected={listing.id === appliedListingId}
                    onSelect={() => handleSelectListing(listing.id)}
                  />
                ))}
              </div>
            ) : null}

            {showReservationSkeleton ? (
              <div className="grid gap-4">
                {reservationSkeletonKeys.map((key) => (
                  <ReservationCardSkeleton key={key} />
                ))}
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-[#dddddd] bg-white p-10 text-center">
                <Inbox className="mx-auto mb-4 size-10 text-[#929292]" />
                <h3 className="text-[22px] font-medium leading-[1.18] tracking-[-0.44px] text-[#222222]">
                  No reservations found
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-[1.43] text-[#6a6a6a]">
                  Try another listing, status, date range, or search term.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {paginatedReservations.map((reservation) => (
                  <ReservationCard
                    key={reservation.reservationId}
                    reservation={reservation}
                  />
                ))}
              </div>
            )}

            {pageCount > 1 ? (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setPage((current) => Math.max(1, current - 1));
                      }}
                    >
                      <ChevronLeft className="size-4" />
                    </PaginationPrevious>
                  </PaginationItem>
                  {Array.from({ length: pageCount }).map((_, index) => {
                    const pageNumber = index + 1;

                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          isActive={pageNumber === currentPage}
                          onClick={(event) => {
                            event.preventDefault();
                            setPage(pageNumber);
                          }}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setPage((current) => Math.min(pageCount, current + 1));
                      }}
                    >
                      <ChevronRight className="size-4" />
                    </PaginationNext>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
          </section>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-[14px] border border-[#dddddd] bg-white p-6 shadow-[rgba(0,0,0,0.02)_0_0_0_1px,rgba(0,0,0,0.04)_0_2px_6px_0,rgba(0,0,0,0.1)_0_4px_8px_0]">
              <h3 className="text-base font-semibold leading-[1.25] text-[#222222]">
                Booking calendar
              </h3>
              <p className="mt-1 text-sm leading-[1.43] text-[#6a6a6a]">
                Occupied nights in the current view
              </p>
              {showReservationSkeleton ? (
                <CalendarSkeleton />
              ) : (
                <Calendar
                  mode="multiple"
                  selected={calendarDates}
                  className="mx-auto mt-4"
                />
              )}
            </section>

            <section className="rounded-[14px] border border-[#dddddd] bg-white p-6">
              <h3 className="text-base font-semibold leading-[1.25] text-[#222222]">
                Next stays
              </h3>
              <div className="mt-4 space-y-4">
                {showReservationSkeleton ? (
                  nextStaySkeletonKeys.map((key) => (
                    <NextStaySkeleton key={key} />
                  ))
                ) : nextReservations.length === 0 ? (
                  <p className="text-sm leading-[1.43] text-[#6a6a6a]">
                    No upcoming stays in this view.
                  </p>
                ) : (
                  nextReservations.map((reservation) => (
                    <Link
                      key={reservation.reservationId}
                      href={`/host/reservations/${reservation.reservationId}`}
                      className="group flex gap-3"
                    >
                      <GuestAvatar reservation={reservation} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium leading-[1.43] text-[#222222]">
                          {formatGuestName(reservation)}
                        </span>
                        <span className="mt-0.5 block text-sm leading-[1.43] text-[#6a6a6a]">
                          {formatDateRange(
                            reservation.checkInDate,
                            reservation.checkOutDate,
                          )}
                        </span>
                      </span>
                      <ArrowRight className="mt-2 size-4 text-[#6a6a6a] transition group-hover:translate-x-1" />
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[14px] border border-[#dddddd] bg-[#f7f7f7] p-6">
              <h3 className="text-base font-semibold leading-[1.25] text-[#222222]">
                Listing scope
              </h3>
              {showListingSkeleton ? (
                <Shimmer className="mt-2 h-4 w-44" rounded="rounded-lg" />
              ) : (
                <p className="mt-1 text-sm leading-[1.43] text-[#6a6a6a]">
                  {appliedListingId === ALL_LISTINGS_ID
                    ? `${listings.length} listings in portfolio`
                    : listingLocation(selectedListing) || "Single listing"}
                </p>
              )}
              {appliedListingId !== ALL_LISTINGS_ID ? (
                <button
                  type="button"
                  onClick={() => handleSelectListing(ALL_LISTINGS_ID)}
                  className="mt-4 text-sm font-medium leading-[1.43] text-[#222222] underline underline-offset-4"
                >
                  View all listings
                </button>
              ) : null}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
