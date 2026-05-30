// ReservationStatusBadge.tsx

import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types/booking.type";

interface ReservationStatusBadgeProps {
  status: BookingStatus;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<
  BookingStatus,
  {
    label: string;
    className: string;
  }
> = {
  PENDING_PAYMENT: {
    label: "Pending payment",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },

  CONFIRMED: {
    label: "Confirmed",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },

  CHECKED_IN: {
    label: "Checked in",
    className: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  },

  CHECKED_OUT: {
    label: "Checked out",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },

  COMPLETED: {
    label: "Completed",
    className: "bg-zinc-100 text-zinc-700 border border-zinc-200",
  },

  CANCELLED_BY_GUEST: {
    label: "Cancelled by guest",
    className: "bg-red-50 text-red-600 border border-red-200",
  },

  CANCELLED_BY_HOST: {
    label: "Cancelled by host",
    className: "bg-red-50 text-red-600 border border-red-200",
  },

  CANCELLED_BY_ADMIN: {
    label: "Cancelled by admin",
    className: "bg-red-50 text-red-600 border border-red-200",
  },

  EXPIRED: {
    label: "Expired",
    className: "bg-slate-100 text-slate-500 border border-slate-200",
  },
};

export function ReservationStatusBadge({
  status,
  size = "md",
  className,
}: ReservationStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium tracking-wide",

        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs",

        config.className,

        className,
      )}
    >
      {config.label}
    </span>
  );
}
