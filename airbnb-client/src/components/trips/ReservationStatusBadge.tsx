// ReservationStatusBadge.tsx

import { cn } from "@/lib/utils";
import {BookingStatus} from "@/types/booking.type";

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
    className:
        "bg-amber-50 text-amber-700 border border-amber-200",
  },

  PAID: {
    label: "Confirmed",
    className:
        "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },

  CANCELLED: {
    label: "Cancelled",
    className:
        "bg-red-50 text-red-600 border border-red-200",
  },

  EXPIRED: {
    label: "Expired",
    className:
        "bg-slate-100 text-slate-500 border border-slate-200",
  },

  REFUNDED: {
    label: "Refunded",
    className:
        "bg-blue-50 text-blue-700 border border-blue-200",
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

              size === "sm"
                  ? "px-2 py-0.5 text-xs"
                  : "px-3 py-1 text-xs",

              config.className,

              className
          )}
      >
            {config.label}
        </span>
  );
}