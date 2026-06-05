"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Home,
  KeyRound,
  Loader2,
  MapPin,
  PawPrint,
  Receipt,
  Users,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  confirmHostCancellationQuote,
  getHostReservationDetail,
  requestHostCancellationQuote,
  updateHostReservationStatus,
} from "@/api/endpoints/booking";
import { ReservationStatusBadge } from "@/components/trips/ReservationStatusBadge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { RootState } from "@/store";
import type {
  BookingStatus,
  HostCancellationQuoteResponse,
  HostCancellationReasonCode,
  HostReservationDetailResponse,
} from "@/types/booking.type";

const fallbackImage = "/header/home.png";
const overviewSkeletonKeys = [
  "overview-check-in",
  "overview-check-out",
  "overview-guests",
  "overview-code",
];
const guestStatSkeletonKeys = [
  "guest-adults",
  "guest-children",
  "guest-infants",
  "guest-pets",
];
const priceSkeletonKeys = [
  "price-accommodation",
  "price-cleaning",
  "price-service",
  "price-taxes",
];
const timelineSkeletonKeys = [
  "timeline-booked",
  "timeline-paid",
  "timeline-check-in",
  "timeline-final",
];
const hostCancellationReasons: Array<{
  code: HostCancellationReasonCode;
  label: string;
}> = [
  { code: "PROPERTY_DAMAGE", label: "Property damage" },
  { code: "PERSONAL_EMERGENCY", label: "Personal emergency" },
  { code: "DOUBLE_BOOKING", label: "Double booking" },
  { code: "UNAVAILABLE", label: "Unavailable" },
  { code: "OTHER", label: "Other" },
];

/**
 * Skeleton shimmer dùng cho detail page.
 * Giữ nguyên kích thước từng section thật để trạng thái loading trông như nội dung đang được dựng dần,
 * thay vì một spinner rỗng làm người dùng tưởng màn hình bị đứng.
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

/**
 * Trích message lỗi chuẩn từ Axios response nếu backend trả về message.
 * Output null nghĩa là lỗi không có format API quen thuộc, caller sẽ dùng fallback message an toàn.
 */
function getApiErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return null;
  }

  const response = (
    error as {
      response?: {
        data?: {
          message?: string;
        };
      };
    }
  ).response;

  return response?.data?.message ?? null;
}

function formatDateTime(value?: string | null, fallback = "Not set") {
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

function formatTime(value?: string | null, fallback = "Not set") {
  if (!value) return fallback;
  return value.slice(0, 5);
}

function totalGuests(reservation: HostReservationDetailResponse) {
  return (
    (reservation.numAdults ?? 0) +
    (reservation.numChildren ?? 0) +
    (reservation.numInfants ?? 0)
  );
}

function guestName(reservation: HostReservationDetailResponse) {
  return reservation.guest?.fullName || "Guest";
}

function guestInitial(reservation: HostReservationDetailResponse) {
  return guestName(reservation).slice(0, 1).toUpperCase();
}

function listingAddress(reservation: HostReservationDetailResponse) {
  const listing = reservation.listing;
  if (!listing) return "Address not available";

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

function coverImage(reservation: HostReservationDetailResponse) {
  return (
    reservation.listing?.photos?.find((photo) => photo.isCover)?.photoUrl ??
    reservation.listing?.photos?.[0]?.photoUrl ??
    fallbackImage
  );
}

/**
 * Xác định CTA chính theo state machine của reservation.
 * CONFIRMED -> host có thể check-in guest; CHECKED_IN -> host có thể mark checkout; CHECKED_OUT -> complete.
 * Các trạng thái terminal không có primary action để tránh update sai flow nghiệp vụ.
 */
function nextPrimaryAction(status: BookingStatus) {
  if (status === "CONFIRMED") {
    return {
      status: "CHECKED_IN" as BookingStatus,
      label: "Mark checked in",
      description: "Use this when the guest has arrived.",
    };
  }

  if (status === "CHECKED_IN") {
    return {
      status: "CHECKED_OUT" as BookingStatus,
      label: "Mark checked out",
      description: "Use this when the guest has left.",
    };
  }

  if (status === "CHECKED_OUT") {
    return {
      status: "COMPLETED" as BookingStatus,
      label: "Mark completed",
      description: "Use this after checkout has been finalized.",
    };
  }

  return null;
}

function canCancel(status: BookingStatus) {
  return status === "CONFIRMED";
}

function statusDisplayName(status: BookingStatus) {
  const labels: Record<BookingStatus, string> = {
    PENDING_PAYMENT: "Pending payment",
    EXPIRED: "Expired",
    CONFIRMED: "Confirmed",
    CHECKED_IN: "Checked in",
    CHECKED_OUT: "Checked out",
    COMPLETED: "Completed",
    CANCELLED_BY_GUEST: "Cancelled by guest",
    CANCELLED_BY_HOST: "Cancelled by host",
    CANCELLED_BY_ADMIN: "Cancelled by admin",
  };

  return labels[status];
}

/**
 * Dựng bản reservation tạm thời ngay trên client sau khi host đổi status.
 * Input: reservation hiện tại + status mới + reason optional.
 * Xử lý: cập nhật statusDisplayName và các timestamp tương ứng giống backend sẽ trả về.
 * Output: state optimistic để UI phản hồi ngay; nếu API fail, caller rollback về bản cũ.
 */
function buildOptimisticReservation(
  reservation: HostReservationDetailResponse,
  status: BookingStatus,
  reason?: string,
): HostReservationDetailResponse {
  const now = new Date().toISOString();
  const trimmedReason = reason?.trim();

  return {
    ...reservation,
    status,
    statusDisplayName: statusDisplayName(status),
    checkedInAt:
      status === "CHECKED_IN" || status === "CHECKED_OUT" || status === "COMPLETED"
        ? (reservation.checkedInAt ?? now)
        : reservation.checkedInAt,
    checkedOutAt:
      status === "CHECKED_OUT" || status === "COMPLETED"
        ? (reservation.checkedOutAt ?? now)
        : reservation.checkedOutAt,
    completedAt:
      status === "COMPLETED"
        ? (reservation.completedAt ?? now)
        : reservation.completedAt,
    cancelledAt:
      status === "CANCELLED_BY_HOST"
        ? (reservation.cancelledAt ?? now)
        : reservation.cancelledAt,
    cancellationReason:
      status === "CANCELLED_BY_HOST"
        ? (trimmedReason ??
          reservation.cancellationReason ??
          "Cancelled by host")
        : reservation.cancellationReason,
  };
}

/**
 * Map trạng thái payment thành label/badge cho host đọc nhanh.
 * Logic này không thay thế backend payment, chỉ diễn giải dữ liệu booking/payment thành UI text.
 */
function paymentStatusMeta(reservation: HostReservationDetailResponse) {
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
      label:
        reservation.payment?.stripePaymentStatus?.replaceAll("_", " ") ||
        "Paid",
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

/**
 * Build timeline từ các mốc thời gian lưu trên Booking.
 * Input: reservation detail.
 * Xử lý: đánh dấu từng bước done dựa trên timestamp hoặc status hiện tại.
 * Output: danh sách step để render timeline vận hành cho host.
 */
function timelineSteps(reservation: HostReservationDetailResponse) {
  const cancelled =
    reservation.status === "CANCELLED_BY_GUEST" ||
    reservation.status === "CANCELLED_BY_HOST" ||
    reservation.status === "CANCELLED_BY_ADMIN";

  return [
    {
      key: "booked",
      label: "Booked",
      value: formatDateTime(reservation.createdAt),
      done: true,
    },
    {
      key: "paid",
      label: "Paid",
      value: formatDateTime(reservation.paidAt),
      done:
        !!reservation.paidAt ||
        ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED"].includes(
          reservation.status,
        ),
    },
    {
      key: "checked-in",
      label: "Checked in",
      value: formatDateTime(reservation.checkedInAt),
      done:
        !!reservation.checkedInAt ||
        ["CHECKED_IN", "CHECKED_OUT", "COMPLETED"].includes(
          reservation.status,
        ),
    },
    {
      key: "checked-out",
      label: "Checked out",
      value: formatDateTime(reservation.checkedOutAt),
      done:
        !!reservation.checkedOutAt ||
        ["CHECKED_OUT", "COMPLETED"].includes(reservation.status),
    },
    {
      key: "final",
      label: cancelled ? "Cancelled" : "Completed",
      value: cancelled
        ? formatDateTime(reservation.cancelledAt)
        : formatDateTime(reservation.completedAt),
      done: cancelled || reservation.status === "COMPLETED",
      danger: cancelled,
    },
  ];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-[#ebebeb] py-8">
      <h2 className="text-[22px] font-medium leading-[1.18] tracking-[-0.44px] text-[#222222]">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SectionSkeleton({
  titleWidth = "w-52",
  children,
}: {
  titleWidth?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[#ebebeb] py-8">
      <Shimmer className={cn("h-7", titleWidth)} rounded="rounded-lg" />
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Fact({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-0.5 text-[#222222]">{icon}</div>
      <div>
        <p className="text-base font-semibold leading-[1.25] text-[#222222]">
          {title}
        </p>
        <div className="mt-1 text-sm leading-[1.43] text-[#6a6a6a]">
          {value}
        </div>
      </div>
    </div>
  );
}

function MoneyRow({
  label,
  amount,
  currency,
}: {
  label: string;
  amount: number;
  currency: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm leading-[1.43]">
      <span className="text-[#3f3f3f]">{label}</span>
      <span className="font-medium text-[#222222]">
        {formatCurrency(amount, currency)}
      </span>
    </div>
  );
}

/**
 * Loading skeleton cho detail page mô phỏng đầy đủ layout thật:
 * hero summary, reservation overview, guest info, pricing section và timeline sidebar.
 * Component này được render khi chưa có reservation để không flash "not found" trước khi API resolve.
 */
function DetailLoadingSkeleton() {
  return (
    <main className="min-h-[calc(100vh-96px)] bg-white pb-16 text-[#222222]">
      <ShimmerStyles />
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <Shimmer className="mb-5 h-5 w-36" rounded="rounded-lg" />

        <header>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <Shimmer className="h-8 w-72 max-w-full" rounded="rounded-lg" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Shimmer className="h-4 w-36" rounded="rounded-lg" />
                <Shimmer className="h-4 w-2" rounded="rounded-full" />
                <Shimmer className="h-4 w-56 max-w-full" rounded="rounded-lg" />
              </div>
            </div>
            <div className="flex gap-2">
              <Shimmer className="h-7 w-24" rounded="rounded-full" />
              <Shimmer className="h-7 w-20" rounded="rounded-full" />
            </div>
          </div>

          <Shimmer className="mt-6 aspect-[16/9] min-h-[260px] w-full" />
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <SectionSkeleton titleWidth="w-56">
              <div className="grid gap-6 sm:grid-cols-2">
                {overviewSkeletonKeys.map((key) => (
                  <div key={key} className="flex gap-4">
                    <Shimmer className="mt-0.5 size-6" rounded="rounded-full" />
                    <div className="min-w-0 flex-1">
                      <Shimmer className="h-5 w-28" rounded="rounded-lg" />
                      <Shimmer
                        className="mt-2 h-4 w-40 max-w-full"
                        rounded="rounded-lg"
                      />
                      <Shimmer className="mt-2 h-4 w-24" rounded="rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </SectionSkeleton>

            <SectionSkeleton titleWidth="w-40">
              <div className="flex items-center gap-4">
                <Shimmer className="size-16" rounded="rounded-full" />
                <div className="min-w-0 flex-1">
                  <Shimmer
                    className="h-5 w-44 max-w-full"
                    rounded="rounded-lg"
                  />
                  <Shimmer
                    className="mt-2 h-4 w-64 max-w-full"
                    rounded="rounded-lg"
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                {guestStatSkeletonKeys.map((key) => (
                  <div
                    key={key}
                    className="rounded-[14px] border border-[#dddddd] p-4"
                  >
                    <Shimmer className="h-4 w-16" rounded="rounded-lg" />
                    <Shimmer className="mt-2 h-7 w-10" rounded="rounded-lg" />
                  </div>
                ))}
              </div>
            </SectionSkeleton>

            <SectionSkeleton titleWidth="w-28">
              <div className="max-w-xl space-y-4">
                {priceSkeletonKeys.map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <Shimmer className="h-4 w-28" rounded="rounded-lg" />
                    <Shimmer className="h-4 w-20" rounded="rounded-lg" />
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-[#dddddd] pt-4">
                  <Shimmer className="h-5 w-14" rounded="rounded-lg" />
                  <Shimmer className="h-5 w-24" rounded="rounded-lg" />
                </div>
              </div>

              <div className="mt-6 rounded-[14px] bg-[#f7f7f7] p-5">
                <Shimmer className="h-4 w-44" rounded="rounded-lg" />
                <Shimmer
                  className="mt-3 h-4 w-full max-w-md"
                  rounded="rounded-lg"
                />
              </div>
            </SectionSkeleton>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-[14px] border border-[#dddddd] bg-white p-6 shadow-[rgba(0,0,0,0.02)_0_0_0_1px,rgba(0,0,0,0.04)_0_2px_6px_0,rgba(0,0,0,0.1)_0_4px_8px_0]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Shimmer className="h-8 w-28" rounded="rounded-lg" />
                  <Shimmer className="mt-2 h-4 w-16" rounded="rounded-lg" />
                </div>
                <Shimmer className="h-6 w-24" rounded="rounded-full" />
              </div>

              <div className="mt-5 overflow-hidden rounded-lg border border-[#222222]">
                <div className="grid grid-cols-2">
                  <div className="border-r border-[#222222] p-3">
                    <Shimmer className="h-4 w-16" rounded="rounded-lg" />
                    <Shimmer className="mt-2 h-4 w-28" rounded="rounded-lg" />
                  </div>
                  <div className="p-3">
                    <Shimmer className="h-4 w-16" rounded="rounded-lg" />
                    <Shimmer className="mt-2 h-4 w-28" rounded="rounded-lg" />
                  </div>
                </div>
                <div className="border-t border-[#222222] p-3">
                  <Shimmer className="h-4 w-14" rounded="rounded-lg" />
                  <Shimmer className="mt-2 h-4 w-32" rounded="rounded-lg" />
                </div>
              </div>

              <Shimmer className="mt-5 h-12 w-full" rounded="rounded-lg" />
              <Shimmer className="mt-3 h-12 w-full" rounded="rounded-lg" />

              <div className="mt-6 border-t border-[#ebebeb] pt-6">
                <Shimmer className="h-5 w-32" rounded="rounded-lg" />
                <div className="mt-4 space-y-4">
                  {timelineSkeletonKeys.map((key) => (
                    <div key={key} className="flex gap-3">
                      <Shimmer
                        className="mt-0.5 size-7"
                        rounded="rounded-full"
                      />
                      <div className="flex-1">
                        <Shimmer className="h-4 w-24" rounded="rounded-lg" />
                        <Shimmer
                          className="mt-2 h-4 w-36"
                          rounded="rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

/**
 * Trang chi tiết reservation cho host/admin.
 *
 * Flow tổng quát:
 * 1. Đọc `reservationId` từ route và token từ auth state.
 * 2. Gọi API detail thật; trong lúc chờ chỉ render skeleton đúng layout.
 * 3. Render thông tin guest/listing/payment/stay rules từ Booking + enrichment của backend.
 * 4. Khi host đổi status, UI optimistic update trước, gọi PATCH backend, sau đó commit response hoặc rollback nếu lỗi.
 * 5. Cancel dùng dialog riêng để thu reason trước khi gửi status CANCELLED.
 */
export default function HostReservationDetailPage() {
  const params = useParams<{ reservationId: string }>();
  const router = useRouter();
  const token = useSelector((state: RootState) => state.auth.token);
  const [reservation, setReservation] =
    useState<HostReservationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingStatus, setSavingStatus] = useState<BookingStatus | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReasonCode, setCancelReasonCode] =
    useState<HostCancellationReasonCode>("UNAVAILABLE");
  const [cancelReason, setCancelReason] = useState("");
  const [cancellationQuote, setCancellationQuote] =
    useState<HostCancellationQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const reservationRequestId = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadReservation() {
      if (!token) {
        setLoading(false);
        setError("Please log in to view this reservation.");
        return;
      }

      const requestId = reservationRequestId.current + 1;
      reservationRequestId.current = requestId;

      // Mỗi lần route/token đổi sẽ tạo requestId mới.
      // Response cũ chỉ được phép ghi state nếu requestId vẫn là request mới nhất.
      setLoading(true);
      setError("");
      try {
        const response = await getHostReservationDetail(
          token,
          params.reservationId,
        );
        if (!cancelled && reservationRequestId.current === requestId) {
          setReservation(response.data);
        }
      } catch {
        if (!cancelled && reservationRequestId.current === requestId) {
          setError("Reservation not found or you do not have access.");
        }
      } finally {
        if (!cancelled && reservationRequestId.current === requestId) {
          setLoading(false);
        }
      }
    }

    void loadReservation();

    return () => {
      cancelled = true;
    };
  }, [params.reservationId, token]);

  const primaryAction = reservation
    ? nextPrimaryAction(reservation.status)
    : null;

  const guestBreakdown = useMemo(() => {
    if (!reservation) return [];

    // Chuẩn hóa số lượng guest thành list để render card thống kê mà không lặp markup.
    return [
      { label: "Adults", value: reservation.numAdults ?? 0 },
      { label: "Children", value: reservation.numChildren ?? 0 },
      { label: "Infants", value: reservation.numInfants ?? 0 },
      { label: "Pets", value: reservation.numPets ?? 0 },
    ];
  }, [reservation]);

  const updateStatus = async (status: BookingStatus, reason?: string) => {
    if (!token || !reservation) return;

    const previousReservation = reservation;
    const trimmedReason = reason?.trim() || undefined;
    setSavingStatus(status);
    setError("");
    setSuccessMessage("");
    // Optimistic update: UI đổi ngay để host thấy thao tác có phản hồi.
    // Nếu backend từ chối transition/quyền truy cập, catch bên dưới rollback về `previousReservation`.
    setReservation(
      buildOptimisticReservation(previousReservation, status, trimmedReason),
    );

    try {
      const response = await updateHostReservationStatus(
        token,
        previousReservation.reservationId,
        { status, reason: trimmedReason },
      );
      setReservation(response.data);
      setSuccessMessage("Reservation status updated.");
      setCancelOpen(false);
      setCancelReason("");
    } catch (err) {
      // Rollback khi API fail để tránh UI hiển thị status không thật so với database.
      setReservation(previousReservation);
      setError(
        getApiErrorMessage(err) ?? "Unable to update reservation status.",
      );
    } finally {
      setSavingStatus(null);
    }
  };

  const loadHostCancellationQuote = async (
    reasonCode = cancelReasonCode,
  ) => {
    if (!token || !reservation) return;

    try {
      setQuoteLoading(true);
      setQuoteError("");
      const response = await requestHostCancellationQuote(
        token,
        reservation.reservationId,
        reasonCode,
      );
      setCancellationQuote(response.data);
    } catch (err) {
      setCancellationQuote(null);
      setQuoteError(
        getApiErrorMessage(err) ?? "Unable to calculate cancellation quote.",
      );
    } finally {
      setQuoteLoading(false);
    }
  };

  const openCancellationDialog = () => {
    setCancelOpen(true);
    setCancellationQuote(null);
    setQuoteError("");
    void loadHostCancellationQuote();
  };

  const handleReasonCodeChange = (reasonCode: HostCancellationReasonCode) => {
    setCancelReasonCode(reasonCode);
    setCancellationQuote(null);
    setQuoteError("");
    void loadHostCancellationQuote(reasonCode);
  };

  const confirmHostCancellation = async () => {
    if (!token || !reservation || !cancellationQuote) return;

    const previousReservation = reservation;
    setCancelSubmitting(true);
    setSavingStatus("CANCELLED_BY_HOST");
    setError("");
    setSuccessMessage("");
    setReservation(
      buildOptimisticReservation(
        previousReservation,
        "CANCELLED_BY_HOST",
        cancelReason,
      ),
    );

    try {
      const response = await confirmHostCancellationQuote(
        token,
        previousReservation.reservationId,
        cancellationQuote.quoteId,
        cancelReason,
      );
      setReservation(response.data);
      setSuccessMessage("Reservation cancelled and refund initiated.");
      setCancelOpen(false);
      setCancelReason("");
      setCancellationQuote(null);
    } catch (err) {
      setReservation(previousReservation);
      setQuoteError(
        getApiErrorMessage(err) ?? "Unable to cancel reservation.",
      );
    } finally {
      setSavingStatus(null);
      setCancelSubmitting(false);
    }
  };

  if (loading && !reservation) {
    return <DetailLoadingSkeleton />;
  }

  if (error && !reservation) {
    return (
      <main className="min-h-[calc(100vh-96px)] bg-white">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-[14px] border border-[#dddddd] bg-white p-8 text-center">
            <AlertTriangle className="mx-auto mb-4 size-10 text-[#c13515]" />
            <h1 className="text-[22px] font-medium leading-[1.18] tracking-[-0.44px] text-[#222222]">
              Reservation unavailable
            </h1>
            <p className="mt-2 text-sm leading-[1.43] text-[#6a6a6a]">
              {error}
            </p>
            <Link
              href="/host/reservations"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-[#ff385c] px-6 text-base font-medium text-white"
            >
              Back to reservations
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!reservation) return null;

  const listing = reservation.listing;
  const payment = reservation.payment;
  const paymentStatus = paymentStatusMeta(reservation);
  const paymentTotal = Number(payment?.totalAmount ?? reservation.totalAmount);
  const accommodationAmount = Number(
    payment?.accommodationAmount ?? reservation.totalAmount,
  );
  const cleaningFee = Number(payment?.cleaningFee ?? 0);
  const serviceFee = Number(payment?.serviceFee ?? 0);
  const taxes = Number(payment?.taxes ?? 0);
  const steps = timelineSteps(reservation);

  return (
    <main className="min-h-[calc(100vh-96px)] bg-white pb-16 text-[#222222]">
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <button
          type="button"
          onClick={() =>
            router.push(`/host/reservations?listingId=${reservation.listingId}`)
          }
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium leading-[1.43] text-[#222222] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to reservations
        </button>

        {error ? (
          <div className="mb-5 rounded-[14px] border border-[#c13515]/20 bg-[#fff8f6] p-4 text-sm font-medium text-[#c13515]">
            {error}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mb-5 rounded-[14px] border border-[#dddddd] bg-[#f7f7f7] p-4 text-sm font-medium text-[#222222]">
            {successMessage}
          </div>
        ) : null}

        <header>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[26px] font-medium leading-[1.18] tracking-[-0.44px] text-[#222222]">
                {guestName(reservation)}'s reservation
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm leading-[1.43] text-[#3f3f3f]">
                <span>{listing?.title ?? "Listing"}</span>
                <span aria-hidden="true">·</span>
                <span>{listingAddress(reservation)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ReservationStatusBadge status={reservation.status} />
              <span
                className={cn(
                  "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold",
                  paymentStatus.className,
                )}
              >
                {paymentStatus.label}
              </span>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[14px] bg-[#f7f7f7]">
            <div className="relative aspect-[16/9] min-h-[260px]">
              <Image
                src={coverImage(reservation)}
                alt={listing?.title ?? "Reservation"}
                fill
                className="object-cover"
                sizes="(max-width: 1128px) 100vw, 1080px"
                priority
              />
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <Section title="Reservation overview">
              <div className="grid gap-6 sm:grid-cols-2">
                <Fact
                  icon={<CalendarDays className="size-6" />}
                  title="Check-in"
                  value={
                    <>
                      {formatDate(reservation.checkInDate)}
                      <br />
                      {formatTime(
                        listing?.checkInStartTime ??
                          listing?.houseRules?.checkInFrom,
                      )}
                    </>
                  }
                />
                <Fact
                  icon={<CalendarDays className="size-6" />}
                  title="Check-out"
                  value={
                    <>
                      {formatDate(reservation.checkOutDate)}
                      <br />
                      {formatTime(
                        listing?.checkOutTime ??
                          listing?.houseRules?.checkOutTime,
                      )}
                    </>
                  }
                />
                <Fact
                  icon={<Users className="size-6" />}
                  title="Guests"
                  value={`${totalGuests(reservation)} guests · ${reservation.totalNights} nights`}
                />
                <Fact
                  icon={<Receipt className="size-6" />}
                  title="Reservation code"
                  value={reservation.reservationCode}
                />
              </div>
            </Section>

            <Section title="Guest details">
              <div className="flex items-center gap-4">
                <div className="relative size-16 overflow-hidden rounded-full bg-[#f2f2f2] text-lg font-semibold text-[#222222]">
                  {reservation.guest?.avatarUrl ? (
                    <Image
                      src={reservation.guest.avatarUrl}
                      alt={guestName(reservation)}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      {guestInitial(reservation)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold leading-[1.25] text-[#222222]">
                    {guestName(reservation)}
                  </p>
                  <p className="truncate text-sm leading-[1.43] text-[#6a6a6a]">
                    {reservation.guest?.keycloakUserId ?? reservation.guestId}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                {guestBreakdown.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[14px] border border-[#dddddd] p-4"
                  >
                    <p className="text-sm leading-[1.43] text-[#6a6a6a]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[22px] font-medium leading-[1.18] tracking-[-0.44px] text-[#222222]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {reservation.guestNotes ? (
                <div className="mt-6 rounded-[14px] bg-[#f7f7f7] p-5">
                  <p className="mb-2 flex items-center gap-2 text-base font-semibold leading-[1.25] text-[#222222]">
                    <FileText className="size-5" />
                    Guest note
                  </p>
                  <p className="whitespace-pre-line text-sm leading-[1.43] text-[#3f3f3f]">
                    {reservation.guestNotes}
                  </p>
                </div>
              ) : null}
            </Section>

            <Section title="Payment">
              <div className="max-w-xl space-y-4">
                <MoneyRow
                  label="Accommodation"
                  amount={accommodationAmount}
                  currency={reservation.currency}
                />
                <MoneyRow
                  label="Cleaning fee"
                  amount={cleaningFee}
                  currency={reservation.currency}
                />
                <MoneyRow
                  label="Service fee"
                  amount={serviceFee}
                  currency={reservation.currency}
                />
                <MoneyRow
                  label="Taxes"
                  amount={taxes}
                  currency={reservation.currency}
                />
                <div className="flex items-center justify-between border-t border-[#dddddd] pt-4 text-base font-semibold leading-[1.25] text-[#222222]">
                  <span>Total</span>
                  <span>
                    {formatCurrency(paymentTotal, reservation.currency)}
                  </span>
                </div>
              </div>

              <div className="mt-6 rounded-[14px] bg-[#f7f7f7] p-5 text-sm leading-[1.43] text-[#3f3f3f]">
                <p>
                  Stripe status:{" "}
                  <span className="font-medium text-[#222222]">
                    {payment?.stripePaymentStatus ?? "Not available"}
                  </span>
                </p>
                <p className="mt-1 break-all">
                  Payment intent:{" "}
                  {payment?.stripePaymentIntentId ??
                    reservation.paymentIntentId ??
                    "Not available"}
                </p>
              </div>
            </Section>

            <Section title="Stay rules">
              <div className="grid gap-6 sm:grid-cols-3">
                <Fact
                  icon={<KeyRound className="size-6" />}
                  title="Check-in window"
                  value={`${formatTime(
                    listing?.houseRules?.checkInFrom ??
                      listing?.checkInStartTime,
                  )} - ${formatTime(
                    listing?.houseRules?.checkInTo ?? listing?.checkInEndTime,
                  )}`}
                />
                <Fact
                  icon={<Clock className="size-6" />}
                  title="Checkout"
                  value={formatTime(
                    listing?.houseRules?.checkOutTime ?? listing?.checkOutTime,
                  )}
                />
                <Fact
                  icon={<PawPrint className="size-6" />}
                  title="Pets"
                  value={
                    listing?.houseRules?.petsAllowed ? "Allowed" : "Not allowed"
                  }
                />
              </div>

              {listing?.houseRules?.additionalRules ? (
                <p className="mt-6 whitespace-pre-line text-sm leading-[1.43] text-[#3f3f3f]">
                  {listing.houseRules.additionalRules}
                </p>
              ) : null}

              {reservation.cancellationReason ? (
                <div className="mt-6 rounded-[14px] border border-[#c13515]/20 bg-[#fff8f6] p-4">
                  <p className="text-sm font-medium text-[#c13515]">
                    Cancellation reason
                  </p>
                  <p className="mt-1 text-sm leading-[1.43] text-[#3f3f3f]">
                    {reservation.cancellationReason}
                  </p>
                </div>
              ) : null}
            </Section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-[14px] border border-[#dddddd] bg-white p-6 shadow-[rgba(0,0,0,0.02)_0_0_0_1px,rgba(0,0,0,0.04)_0_2px_6px_0,rgba(0,0,0,0.1)_0_4px_8px_0]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[22px] font-bold leading-[1.43] text-[#222222]">
                    {formatCurrency(paymentTotal, reservation.currency)}
                  </p>
                  <p className="text-sm leading-[1.43] text-[#6a6a6a]">
                    {reservation.totalNights} nights
                  </p>
                </div>
                <ReservationStatusBadge status={reservation.status} size="sm" />
              </div>

              <div className="mt-5 overflow-hidden rounded-lg border border-[#222222]">
                <div className="grid grid-cols-2">
                  <div className="border-r border-[#222222] p-3">
                    <p className="text-xs font-bold leading-[1.33] text-[#222222]">
                      Check-in
                    </p>
                    <p className="mt-1 text-sm leading-[1.43] text-[#3f3f3f]">
                      {formatDate(reservation.checkInDate)}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold leading-[1.33] text-[#222222]">
                      Checkout
                    </p>
                    <p className="mt-1 text-sm leading-[1.43] text-[#3f3f3f]">
                      {formatDate(reservation.checkOutDate)}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[#222222] p-3">
                  <p className="text-xs font-bold leading-[1.33] text-[#222222]">
                    Guests
                  </p>
                  <p className="mt-1 text-sm leading-[1.43] text-[#3f3f3f]">
                    {totalGuests(reservation)} guests
                    {reservation.numPets ? `, ${reservation.numPets} pets` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {primaryAction ? (
                  <button
                    type="button"
                    onClick={() => updateStatus(primaryAction.status)}
                    disabled={savingStatus === primaryAction.status}
                    className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#ff385c] px-6 text-base font-medium text-white transition active:bg-[#e00b41] disabled:bg-[#ffd1da]"
                  >
                    {savingStatus === primaryAction.status ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    {primaryAction.label}
                  </button>
                ) : null}

                {canCancel(reservation.status) ? (
                  <button
                    type="button"
                    onClick={openCancellationDialog}
                    className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-[#222222] bg-white px-6 text-base font-medium text-[#222222] transition hover:bg-[#f7f7f7]"
                  >
                    Cancel reservation
                  </button>
                ) : null}

                {primaryAction ? (
                  <p className="text-center text-sm leading-[1.43] text-[#6a6a6a]">
                    {primaryAction.description}
                  </p>
                ) : (
                  <p className="text-center text-sm leading-[1.43] text-[#6a6a6a]">
                    This reservation is terminal.
                  </p>
                )}
              </div>

              <div className="mt-6 border-t border-[#ebebeb] pt-6">
                <h3 className="text-base font-semibold leading-[1.25] text-[#222222]">
                  Status timeline
                </h3>
                <div className="mt-4 space-y-4">
                  {steps.map((step) => (
                    <div key={step.key} className="flex gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border",
                          step.done
                            ? step.danger
                              ? "border-[#c13515] bg-[#fff8f6] text-[#c13515]"
                              : "border-[#222222] bg-[#222222] text-white"
                            : "border-[#dddddd] bg-white text-[#929292]",
                        )}
                      >
                        {step.danger ? (
                          <XCircle className="size-4" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-medium leading-[1.43] text-[#222222]">
                          {step.label}
                        </p>
                        <p className="text-sm leading-[1.43] text-[#6a6a6a]">
                          {step.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-[14px] border border-[#dddddd] bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <Home className="size-5 text-[#222222]" />
                <h3 className="text-base font-semibold leading-[1.25] text-[#222222]">
                  Listing context
                </h3>
              </div>
              <p className="text-sm font-medium leading-[1.43] text-[#222222]">
                {listing?.title ?? "Listing"}
              </p>
              <p className="mt-1 flex items-start gap-2 text-sm leading-[1.43] text-[#6a6a6a]">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                {listingAddress(reservation)}
              </p>
            </section>
          </aside>
        </div>
      </section>

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (savingStatus !== "CANCELLED_BY_HOST") {
            setCancelOpen(open);
            if (!open) {
              setQuoteError("");
              setCancellationQuote(null);
            }
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-[14px] bg-white">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[22px] font-medium leading-[1.18] tracking-[-0.44px] text-[#222222]">
              Cancel reservation?
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-[1.43] text-[#6a6a6a]">
              This will release the dates and notify the guest. Use this only
              when the host cannot honor the reservation.
            </DialogDescription>
          </DialogHeader>

          <label className="text-sm font-medium leading-[1.43] text-[#222222]">
            Reason code
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {hostCancellationReasons.map((reason) => (
                <button
                  key={reason.code}
                  type="button"
                  onClick={() => handleReasonCodeChange(reason.code)}
                  disabled={quoteLoading || cancelSubmitting}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm font-medium transition",
                    cancelReasonCode === reason.code
                      ? "border-[#222222] bg-[#f7f7f7] text-[#222222]"
                      : "border-[#dddddd] bg-white text-[#6a6a6a] hover:border-[#222222]",
                  )}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </label>

          <div className="rounded-lg border border-[#dddddd] bg-[#f7f7f7] p-4">
            {quoteLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#6a6a6a]">
                <Loader2 className="size-4 animate-spin" />
                Calculating cancellation quote...
              </div>
            ) : quoteError ? (
              <div>
                <p className="text-sm font-medium text-[#c13515]">
                  {quoteError}
                </p>
                <button
                  type="button"
                  onClick={() => loadHostCancellationQuote()}
                  className="mt-2 text-sm font-medium text-[#222222] underline underline-offset-2"
                >
                  Retry quote
                </button>
              </div>
            ) : cancellationQuote ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#6a6a6a]">Guest refund</span>
                  <span className="font-semibold text-[#222222]">
                    {formatCurrency(
                      Number(cancellationQuote.guestRefundAmount),
                      cancellationQuote.currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#6a6a6a]">Penalty points</span>
                  <span className="font-semibold text-[#c13515]">
                    {cancellationQuote.penaltyPoints}
                  </span>
                </div>
                <div className="border-t border-[#dddddd] pt-3">
                  <p className="font-medium text-[#222222]">
                    Threshold result
                  </p>
                  <p className="mt-1 text-[#6a6a6a]">
                    Listing penalties in 90 days:{" "}
                    {
                      cancellationQuote.thresholdResult
                        .listingActivePenaltyCount
                    }
                    /3
                  </p>
                  <p className="text-[#6a6a6a]">
                    Host penalties in 180 days:{" "}
                    {cancellationQuote.thresholdResult.hostActivePenaltyCount}
                    /5
                  </p>
                  {cancellationQuote.thresholdResult.willSuspendListing ? (
                    <p className="mt-2 font-medium text-[#c13515]">
                      This listing will be suspended for 7 days.
                    </p>
                  ) : null}
                  {cancellationQuote.thresholdResult
                    .willMarkHostAdminReview ? (
                    <p className="mt-2 font-medium text-[#c13515]">
                      This host will be marked for admin review.
                    </p>
                  ) : null}
                </div>
                <p className="text-xs text-[#6a6a6a]">
                  Quote expires at{" "}
                  {new Date(cancellationQuote.expiresAt).toLocaleTimeString(
                    "en-US",
                    { hour: "numeric", minute: "2-digit" },
                  )}
                  .
                </p>
              </div>
            ) : null}
          </div>

          <label className="text-sm font-medium leading-[1.43] text-[#222222]">
            Guest-facing note
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={4}
              placeholder="Share a short reason for the guest..."
              className="mt-2 w-full resize-none rounded-lg border border-[#dddddd] bg-white p-3 text-base font-normal leading-[1.5] text-[#222222] outline-none focus:border-2 focus:border-[#222222]"
            />
          </label>

          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                disabled={cancelSubmitting}
                className="h-12 rounded-lg border border-[#222222] bg-white px-6 text-base font-medium text-[#222222] transition hover:bg-[#f7f7f7] disabled:opacity-60"
              >
                Keep reservation
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={confirmHostCancellation}
              disabled={!cancellationQuote || quoteLoading || cancelSubmitting}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-[#ff385c] px-6 text-base font-medium text-white transition active:bg-[#e00b41] disabled:bg-[#ffd1da]"
            >
              {cancelSubmitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Cancel reservation
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
