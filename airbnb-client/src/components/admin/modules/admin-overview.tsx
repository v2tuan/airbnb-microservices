"use client";

import {
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  ClipboardList,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type AdminPaymentOverview,
  type AdminReservationSummary,
  getAdminPaymentOverview,
  listAdminComplaints,
  listAdminHostPenalties,
  listAdminReservations,
} from "@/api/endpoints/admin";
import { AdminHomeLink, useAdminToken } from "@/components/admin/admin-shell";
import {
  AdminErrorState,
  AdminPageHeader,
  getAdminErrorMessage,
  TextStatusPill,
} from "@/components/admin/admin-ui";
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
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";
import type { BookingStatus } from "@/types/booking.type";

type AdminDashboardData = {
  payment: AdminPaymentOverview | null;
  reservations: AdminReservationSummary[];
  complaintsCount: number;
  hostPenaltiesCount: number;
  auditEvents: Array<{
    eventId: string;
    eventType: string;
    entityType?: string | null;
    entityId?: string | null;
    severity: string;
    message: string;
    occurredAt: string;
  }>;
  errors: string[];
};

const emptyPaymentOverview: AdminPaymentOverview = {
  summary: {
    paymentCount: 0,
    capturedAmount: 0,
    refundCount: 0,
    refundedAmount: 0,
    pendingPayoutCount: 0,
    pendingPayoutAmount: 0,
    currency: "USD",
  },
  paymentFlow: [],
  transactionStatus: [],
  payoutAging: [],
  queue: [],
};

const activityChartConfig = {
  bookings: { label: "Bookings", color: "#ff385c" },
  complaints: { label: "Complaints", color: "#222222" },
} satisfies ChartConfig;

const statusChartConfig = {
  count: { label: "Bookings", color: "#ff385c" },
} satisfies ChartConfig;

const paymentFlowChartConfig = {
  captured: { label: "Captured", color: "#ff385c" },
  refunded: { label: "Refunded", color: "#c13515" },
  payout: { label: "Payout", color: "#222222" },
} satisfies ChartConfig;

const transactionStatusChartConfig = {
  count: { label: "Transactions", color: "#ff385c" },
} satisfies ChartConfig;

const payoutAgingChartConfig = {
  amount: { label: "Amount", color: "#222222" },
} satisfies ChartConfig;

function toneClasses(tone: string) {
  return {
    brand: "bg-rose-50 text-[#ff385c] ring-rose-100",
    warning: "bg-amber-50 text-amber-800 ring-amber-100",
    danger: "bg-red-50 text-red-700 ring-red-100",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    neutral: "bg-[#f7f7f7] text-[#222222] ring-[#ebebeb]",
  }[tone];
}

function statusTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "COMPLETED" || normalized === "SUCCEEDED") {
    return "success";
  }
  if (
    normalized === "PENDING" ||
    normalized === "PROCESSING" ||
    normalized === "PENDING_CHECKIN" ||
    normalized === "SCHEDULED" ||
    normalized === "RETRY"
  ) {
    return "warning";
  }
  if (normalized === "FAILED" || normalized === "CANCELLED") return "danger";
  return "neutral";
}

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "Not set";
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function buildWeeklyOperations(
  reservations: AdminReservationSummary[],
  complaintsCount: number,
) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, day: formatDay(key), bookings: 0, complaints: 0 };
  });

  const byKey = new Map(days.map((item) => [item.key, item]));
  reservations.forEach((reservation) => {
    const key = reservation.createdAt?.slice(0, 10);
    const bucket = byKey.get(key);
    if (bucket) bucket.bookings += 1;
  });

  if (complaintsCount > 0) {
    days[days.length - 1].complaints = complaintsCount;
  }

  return days;
}

function buildBookingStatus(reservations: AdminReservationSummary[]) {
  const counts = new Map<BookingStatus, number>();
  reservations.forEach((reservation) => {
    counts.set(reservation.status, (counts.get(reservation.status) ?? 0) + 1);
  });
  return Array.from(counts.entries()).map(([status, count]) => ({
    status: status.replaceAll("_", " "),
    count,
  }));
}

export function AdminOverviewModule() {
  const { token } = useAdminToken();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<AdminDashboardData>({
    payment: null,
    reservations: [],
    complaintsCount: 0,
    hostPenaltiesCount: 0,
    auditEvents: [],
    errors: [],
  });

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.allSettled([
      getAdminPaymentOverview(token),
      listAdminReservations(token, { page: 0, size: 200 }),
      listAdminComplaints(token),
      listAdminHostPenalties(token),
    ]).then((results) => {
      if (!active) return;

      const errors: string[] = [];
      const [payment, reservations, complaints, penalties] = results;

      if (payment.status === "rejected") {
        errors.push(
          getAdminErrorMessage(
            payment.reason,
            "Payment overview API is not available.",
          ),
        );
      }
      if (reservations.status === "rejected") {
        errors.push(
          getAdminErrorMessage(
            reservations.reason,
            "Reservation admin list API is not available.",
          ),
        );
      }
      if (complaints.status === "rejected") {
        errors.push(
          getAdminErrorMessage(
            complaints.reason,
            "Complaint admin API is not available.",
          ),
        );
      }
      if (penalties.status === "rejected") {
        errors.push(
          getAdminErrorMessage(
            penalties.reason,
            "Host penalty admin list API is not available.",
          ),
        );
      }

      setDashboard({
        payment: payment.status === "fulfilled" ? payment.value.data : null,
        reservations:
          reservations.status === "fulfilled" ? reservations.value.data : [],
        complaintsCount:
          complaints.status === "fulfilled" ? complaints.value.data.length : 0,
        hostPenaltiesCount:
          penalties.status === "fulfilled" ? penalties.value.data.length : 0,
        auditEvents: [],
        errors,
      });
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [token]);

  const payment = dashboard.payment ?? emptyPaymentOverview;
  const currency = payment.summary.currency || "USD";
  const weeklyOperations = useMemo(
    () =>
      buildWeeklyOperations(dashboard.reservations, dashboard.complaintsCount),
    [dashboard.reservations, dashboard.complaintsCount],
  );
  const bookingStatus = useMemo(
    () => buildBookingStatus(dashboard.reservations),
    [dashboard.reservations],
  );

  const metrics = [
    {
      label: "Open reservations",
      value: dashboard.reservations.length,
      delta: loading ? "Loading" : "Live",
      note: "Rows returned by booking-service",
      icon: ClipboardList,
      tone: "brand",
    },
    {
      label: "Transactions",
      value: formatCurrency(payment.summary.capturedAmount, currency),
      delta: `${payment.summary.paymentCount} paid`,
      note: "Captured payment volume",
      icon: CreditCard,
      tone: "success",
    },
    {
      label: "Payouts pending",
      value: formatCurrency(payment.summary.pendingPayoutAmount, currency),
      delta: `${payment.summary.pendingPayoutCount} payouts`,
      note: "Waiting for payout cycle",
      icon: Banknote,
      tone: "warning",
    },
    {
      label: "Refund queue",
      value: payment.summary.refundCount,
      delta: formatCurrency(payment.summary.refundedAmount, currency),
      note: "Refund records from payment-service",
      icon: BadgeDollarSign,
      tone: "neutral",
    },
  ] as const;

  const recentEvents = dashboard.auditEvents.slice(0, 5);

  return (
    <>
      <AdminPageHeader
        eyebrow="Admin operations"
        title="Dashboard"
        description="Live operational data for reservations, payments, payouts and admin review queues."
        action={<AdminHomeLink />}
      />

      <main className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-8">
        {dashboard.errors.length ? (
          <AdminErrorState
            title="Some live data could not be loaded"
            description={dashboard.errors.join(" ")}
          />
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <Card
                key={metric.label}
                className="rounded-[14px] border-[#dddddd] bg-white shadow-none"
              >
                <CardHeader className="pb-2">
                  <CardDescription className="text-sm text-[#6a6a6a]">
                    {metric.label}
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold text-[#222222]">
                    {metric.value}
                  </CardTitle>
                  <CardAction>
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full ring-1",
                        toneClasses(metric.tone),
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full border-[#dddddd] bg-white text-[#222222]"
                    >
                      {metric.delta}
                    </Badge>
                    <span className="text-sm text-[#6a6a6a]">
                      {metric.note}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <div className="flex justify-end">
          <Button
            asChild
            className="h-10 rounded-[8px] bg-[#ff385c] px-4 text-white hover:bg-[#e00b41]"
          >
            <Link href="/admin/refunds">
              Open payment queue
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>

        <section className="space-y-4">
          <div>
            <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#222222]">
                  Weekly operations
                </CardTitle>
                <CardDescription className="text-[#6a6a6a]">
                  Booking rows and currently escalated complaints.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={activityChartConfig}
                  className="h-[300px] w-full"
                >
                  <AreaChart data={weeklyOperations}>
                    <CartesianGrid vertical={false} stroke="#ebebeb" />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      dataKey="bookings"
                      type="natural"
                      fill="#fff1f3"
                      stroke="#ff385c"
                      strokeWidth={2}
                    />
                    <Area
                      dataKey="complaints"
                      type="natural"
                      fill="transparent"
                      stroke="#222222"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#222222]">
                  Booking status
                </CardTitle>
                <CardDescription className="text-[#6a6a6a]">
                  Current admin rows by lifecycle state.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={statusChartConfig}
                  className="h-[300px] w-full"
                >
                  <BarChart data={bookingStatus} layout="vertical">
                    <CartesianGrid horizontal={false} stroke="#ebebeb" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="status"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={110}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#ff385c" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#222222]">
                  Recent admin events
                </CardTitle>
                <CardDescription className="text-[#6a6a6a]">
                  Events returned by the admin audit endpoint.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Event</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEvents.length ? (
                      recentEvents.map((item) => (
                        <TableRow key={item.eventId}>
                          <TableCell className="font-medium text-[#222222]">
                            {item.message || item.eventType}
                          </TableCell>
                          <TableCell className="text-[#6a6a6a]">
                            {item.entityType ?? "Entity"} /{" "}
                            {shortId(item.entityId)}
                          </TableCell>
                          <TableCell className="text-[#6a6a6a]">
                            {item.severity}
                          </TableCell>
                          <TableCell className="text-right text-[#6a6a6a]">
                            {formatDay(item.occurredAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-[#6a6a6a]"
                        >
                          No audit events returned.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#222222]">
                  Payment flow
                </CardTitle>
                <CardDescription className="text-[#6a6a6a]">
                  Captured payments, refunds and host payouts from
                  payment-service.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={paymentFlowChartConfig}
                  className="h-[320px] w-full"
                >
                  <LineChart
                    data={payment.paymentFlow.map((item) => ({
                      ...item,
                      day: formatDay(item.date),
                    }))}
                  >
                    <CartesianGrid vertical={false} stroke="#ebebeb" />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      dataKey="captured"
                      type="monotone"
                      stroke="#ff385c"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="refunded"
                      type="monotone"
                      stroke="#c13515"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="payout"
                      type="monotone"
                      stroke="#222222"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#222222]">
                  Payout aging
                </CardTitle>
                <CardDescription className="text-[#6a6a6a]">
                  Pending payout amount by age bucket.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={payoutAgingChartConfig}
                  className="h-[320px] w-full"
                >
                  <BarChart data={payment.payoutAging}>
                    <CartesianGrid vertical={false} stroke="#ebebeb" />
                    <XAxis
                      dataKey="bucket"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="amount"
                      fill="#222222"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
            <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#222222]">
                  Transaction status
                </CardTitle>
                <CardDescription className="text-[#6a6a6a]">
                  Payment records grouped by settlement state.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={transactionStatusChartConfig}
                  className="h-[280px] w-full"
                >
                  <BarChart data={payment.transactionStatus} layout="vertical">
                    <CartesianGrid horizontal={false} stroke="#ebebeb" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="status"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={112}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#ff385c" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#222222]">
                  Payment operations queue
                </CardTitle>
                <CardDescription className="text-[#6a6a6a]">
                  Transactions, refunds and payouts that need admin attention.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Record</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payment.queue.length ? (
                      payment.queue.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-[#222222]">
                                {shortId(item.id)}
                              </p>
                              <p className="text-xs text-[#6a6a6a]">
                                {item.owner}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-[#6a6a6a]">
                            {item.type}
                          </TableCell>
                          <TableCell className="text-[#6a6a6a]">
                            {shortId(item.bookingId)}
                          </TableCell>
                          <TableCell>
                            <TextStatusPill
                              tone={
                                statusTone(item.status) as
                                  | "neutral"
                                  | "success"
                                  | "warning"
                                  | "danger"
                                  | "brand"
                              }
                            >
                              {item.status}
                            </TextStatusPill>
                          </TableCell>
                          <TableCell className="text-right font-medium text-[#222222]">
                            {formatCurrency(item.amount, item.currency)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-[#6a6a6a]"
                        >
                          No payment operations require attention.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </>
  );
}
