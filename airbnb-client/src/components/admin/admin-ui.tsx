import { AlertCircle, Inbox } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AdminAccountMenu } from "@/components/admin/admin-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types/booking.type";

export const adminBrand = {
  rausch: "#ff385c",
  rauschActive: "#e00b41",
  ink: "#222222",
  body: "#3f3f3f",
  muted: "#6a6a6a",
  mutedSoft: "#929292",
  hairline: "#dddddd",
  hairlineSoft: "#ebebeb",
  soft: "#f7f7f7",
  strong: "#f2f2f2",
  shadow:
    "shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.10)]",
};

const bookingStatusLabels: Record<BookingStatus, string> = {
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

const bookingStatusClasses: Record<BookingStatus, string> = {
  PENDING_PAYMENT: "border-amber-200 bg-amber-50 text-amber-800",
  EXPIRED: "border-neutral-200 bg-neutral-100 text-neutral-600",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CHECKED_IN: "border-blue-200 bg-blue-50 text-blue-700",
  CHECKED_OUT: "border-indigo-200 bg-indigo-50 text-indigo-700",
  COMPLETED: "border-neutral-300 bg-white text-neutral-950",
  CANCELLED_BY_GUEST: "border-rose-200 bg-rose-50 text-rose-700",
  CANCELLED_BY_HOST: "border-red-200 bg-red-50 text-red-700",
  CANCELLED_BY_ADMIN: "border-zinc-300 bg-zinc-100 text-zinc-800",
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="border-b border-[#dedee6] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#dedee6] bg-[#f4f4f6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#696b78]">
            <span className="size-1.5 rounded-full bg-[#ff385c]" />
            {eyebrow}
          </div>
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-[#0b0b0f]">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#696b78]">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {action}
          <AdminAccountMenu operationLabel={eyebrow} />
        </div>
      </div>
    </header>
  );
}

export function AdminCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-[16px] border-[#dedee6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className,
      )}
    >
      {children}
    </Card>
  );
}

export function AdminMetricCard({
  label,
  value,
  note,
  accent = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  accent?: "neutral" | "brand" | "success" | "warning" | "danger";
  icon?: LucideIcon;
}) {
  const accents = {
    neutral: {
      icon: "bg-[#f4f4f6] text-[#0b0b0f]",
      dot: "bg-[#a6a7ad]",
      bar: "bg-[#0b0b0f]",
    },
    brand: {
      icon: "bg-rose-50 text-[#ff385c]",
      dot: "bg-[#ff385c]",
      bar: "bg-[#ff385c]",
    },
    success: {
      icon: "bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
      bar: "bg-emerald-500",
    },
    warning: {
      icon: "bg-amber-50 text-amber-800",
      dot: "bg-amber-400",
      bar: "bg-amber-400",
    },
    danger: {
      icon: "bg-red-50 text-red-700",
      dot: "bg-red-500",
      bar: "bg-red-500",
    },
  };
  const style = accents[accent];

  return (
    <Card className="group relative overflow-hidden rounded-[16px] border-[#dedee6] bg-white py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(16,24,40,0.08)]">
      <span className={cn("absolute inset-x-0 top-0 h-1", style.bar)} />
      <CardHeader className="flex-row items-start justify-between gap-3 px-5">
        <div className="min-w-0">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-[#696b78]">
            {label}
          </CardTitle>
        </div>
        <CardAction className="m-0">
          {Icon ? (
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-[12px]",
                style.icon,
              )}
            >
              <Icon className="size-4" />
            </span>
          ) : (
            <span className={cn("block size-2 rounded-full", style.dot)} />
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="px-5">
        <p className="text-[30px] font-semibold leading-tight tracking-[-0.01em] text-[#0b0b0f]">
          {value}
        </p>
        <p className="mt-2 text-sm leading-5 text-[#696b78]">{note}</p>
      </CardContent>
    </Card>
  );
}

export function BookingStatusPill({ status }: { status: BookingStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-semibold",
        bookingStatusClasses[status],
      )}
    >
      {bookingStatusLabels[status]}
    </Badge>
  );
}

export function TextStatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "brand";
}) {
  const classes = {
    neutral: "border-neutral-200 bg-neutral-50 text-neutral-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-700",
    brand: "border-rose-200 bg-rose-50 text-[#ff385c]",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-semibold",
        classes[tone],
      )}
    >
      {children}
    </Badge>
  );
}

export function AdminLoadingRows({ rows = 5 }: { rows?: number }) {
  const rowKeys = [
    "north",
    "east",
    "south",
    "west",
    "center",
    "harbor",
    "garden",
    "studio",
    "terrace",
    "loft",
    "courtyard",
    "atrium",
  ].slice(0, rows);

  return (
    <div className="space-y-3">
      {rowKeys.map((rowKey) => (
        <Skeleton key={`admin-row-${rowKey}`} className="h-16 rounded-[14px]" />
      ))}
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <Empty className="min-h-64 rounded-[16px] border border-dashed border-[#dedee6] bg-[#f4f4f6]">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="rounded-full bg-white text-[#222222]"
        >
          <Inbox className="size-5" />
        </EmptyMedia>
        <EmptyTitle className="text-[#222222]">{title}</EmptyTitle>
        <EmptyDescription className="max-w-xl text-[#6a6a6a]">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {actionHref && actionLabel ? (
        <EmptyContent>
          <Button
            asChild
            className="h-12 rounded-[8px] bg-[#ff385c] px-6 text-white"
          >
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

export function AdminErrorState({
  title = "Module is waiting for backend support",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <Alert className="rounded-[16px] border-amber-200 bg-amber-50 text-amber-950 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <AlertCircle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="text-amber-800">
        {description}
      </AlertDescription>
    </Alert>
  );
}

export function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6a6a6a]">
        {label}
      </span>
      {children}
    </div>
  );
}

export function AdminSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <CardHeader className="border-b border-[#dedee6] bg-white/80 pb-5">
      <div>
        <CardTitle className="text-base font-semibold leading-tight text-[#0b0b0f]">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="mt-1 leading-6 text-[#696b78]">
            {description}
          </CardDescription>
        ) : null}
      </div>
      {action ? <CardAction>{action}</CardAction> : null}
    </CardHeader>
  );
}

export function formatAdminDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function canForceCancelStatus(status: BookingStatus) {
  return status === "CONFIRMED" || status === "CHECKED_IN";
}

export function getAdminErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return fallback;
  }

  const response = (
    error as {
      response?: {
        data?: {
          message?: string;
          error?: string;
        };
      };
    }
  ).response;

  return response?.data?.message ?? response?.data?.error ?? fallback;
}
