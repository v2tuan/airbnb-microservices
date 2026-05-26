import { cn } from "@/lib/utils";

export type PaymentStatus = "paid" | "pending" | "cancelled" | "refunded";

interface BookingStatusBadgeProps {
  status: PaymentStatus;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  paid: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
  },
  refunded: {
    label: "Refunded",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
};

export function BookingStatusBadge({
  status,
  size = "md",
  className,
}: BookingStatusBadgeProps) {
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
