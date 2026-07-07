"use client";

import {
  BadgeDollarSign,
  Building2,
  CalendarCheck,
  CreditCard,
  Download,
  MoreHorizontal,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type AdminPaymentOverview,
  type AdminReservationSummary,
  getAdminPaymentOverview,
  listAdminListings,
  listAdminReservations,
} from "@/api/endpoints/admin";
import type { ListingResponse } from "@/api/endpoints/listing";
import { useAdminToken } from "@/components/admin/admin-shell";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPageHeader,
  getAdminErrorMessage,
  TextStatusPill,
} from "@/components/admin/admin-ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";

const emptyPayment: AdminPaymentOverview = {
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

const revenueConfig = {
  captured: { label: "Captured", color: "#050507" },
  refunded: { label: "Refunded", color: "#a6a7ad" },
} satisfies ChartConfig;

const visitsConfig = {
  value: { label: "Transactions", color: "#ff385c" },
} satisfies ChartConfig;

const reservationStatusConfig = {
  count: { label: "Reservations", color: "#050507" },
} satisfies ChartConfig;

const pieColors = ["#050507", "#5b5d68", "#a6a7ad", "#d7d8de"];

function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function statusTone(status: string) {
  const normalized = status.toUpperCase();
  if (
    ["ACTIVE", "PAID", "COMPLETED", "CONFIRMED", "SUCCESS"].includes(normalized)
  ) {
    return "success";
  }
  if (
    ["PENDING", "PENDING_PAYMENT", "DRAFT", "PROCESSING"].includes(normalized)
  ) {
    return "warning";
  }
  if (
    normalized.includes("CANCELLED") ||
    normalized === "SUSPENDED" ||
    normalized === "FAILED"
  ) {
    return "danger";
  }
  return "neutral";
}

function shortId(value?: string | null, length = 8) {
  if (!value) return "Unknown";
  return value.replaceAll("-", "").slice(0, length).toUpperCase();
}

function displayStatus(status: string) {
  return status.replaceAll("_", " ");
}

function displayReservationCode(item: AdminReservationSummary) {
  return item.reservationCode ?? `BK-${shortId(item.bookingId)}`;
}

function displayGuest(item: AdminReservationSummary) {
  return item.guestName?.trim() || "Guest name unavailable";
}

function displayListing(item: AdminReservationSummary) {
  return item.listingTitle?.trim() || "Listing title unavailable";
}

function getListingCover(item: ListingResponse) {
  return (
    item.photos?.find((photo) => photo.isCover)?.photoUrl ??
    item.photos?.[0]?.photoUrl
  );
}

function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 27);

  const format = (date: Date) =>
    date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return `${format(start)} - ${format(end)}`;
}

function buildTransactionTypes(
  payment: AdminPaymentOverview,
  reservations: AdminReservationSummary[],
) {
  const bookingCount = reservations.filter((item) =>
    ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED"].includes(
      item.status,
    ),
  ).length;
  const pendingCount = reservations.filter(
    (item) => item.status === "PENDING_PAYMENT",
  ).length;
  const cancelledCount = reservations.filter((item) =>
    item.status.includes("CANCELLED"),
  ).length;
  const refundCount = payment.summary.refundCount;
  const payoutCount = payment.summary.pendingPayoutCount;
  const total = Math.max(
    bookingCount + refundCount + payoutCount + pendingCount + cancelledCount,
    1,
  );

  return [
    { name: "Bookings", count: bookingCount },
    { name: "Refunds", count: refundCount },
    { name: "Payouts", count: payoutCount },
    { name: "Pending", count: pendingCount },
    { name: "Cancelled", count: cancelledCount },
  ]
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: item.name,
      count: item.count,
      value: Math.round((item.count / total) * 100),
    }));
}

function buildReservationStatusRows(reservations: AdminReservationSummary[]) {
  const counts = new Map<string, number>();
  reservations.forEach((reservation) => {
    counts.set(reservation.status, (counts.get(reservation.status) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([status, count]) => ({
      status: status.replaceAll("_", " "),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildTopBookedListings(
  reservations: AdminReservationSummary[],
  listings: ListingResponse[],
) {
  const listingMap = new Map(
    listings.map((listing) => [listing.listingId, listing]),
  );
  const counts = new Map<
    string,
    {
      listingId: string;
      title: string;
      city?: string | null;
      country?: string | null;
      coverImageUrl?: string;
      status?: string;
      bookingCount: number;
      revenue: number;
      currency: string;
    }
  >();

  reservations.forEach((reservation) => {
    const listing = listingMap.get(reservation.listingId);
    const current = counts.get(reservation.listingId);

    counts.set(reservation.listingId, {
      listingId: reservation.listingId,
      title:
        listing?.title ??
        reservation.listingTitle ??
        "Listing title unavailable",
      city: listing?.city,
      country: listing?.country,
      coverImageUrl: listing ? getListingCover(listing) : undefined,
      status: listing?.status,
      bookingCount: (current?.bookingCount ?? 0) + 1,
      revenue: (current?.revenue ?? 0) + reservation.totalAmount,
      currency: reservation.currency,
    });
  });

  return Array.from(counts.values())
    .sort((a, b) => b.bookingCount - a.bookingCount || b.revenue - a.revenue)
    .slice(0, 8);
}

export function AdminOverviewModule() {
  const { token } = useAdminToken();
  const [payment, setPayment] = useState<AdminPaymentOverview>(emptyPayment);
  const [reservations, setReservations] = useState<AdminReservationSummary[]>(
    [],
  );
  const [listings, setListings] = useState<ListingResponse[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      getAdminPaymentOverview(token),
      listAdminReservations(token, { page: 0, size: 80 }),
      listAdminListings(token, { page: 0, size: 60 }),
    ]).then((results) => {
      if (!active) return;

      const nextErrors: string[] = [];
      const [paymentResult, reservationsResult, listingsResult] = results;

      if (paymentResult.status === "fulfilled") {
        setPayment(paymentResult.value.data ?? emptyPayment);
      } else {
        setPayment(emptyPayment);
        nextErrors.push(
          getAdminErrorMessage(
            paymentResult.reason,
            "Payment overview API is not available.",
          ),
        );
      }

      if (reservationsResult.status === "fulfilled") {
        setReservations(reservationsResult.value.data ?? []);
      } else {
        setReservations([]);
        nextErrors.push(
          getAdminErrorMessage(
            reservationsResult.reason,
            "Reservation admin API is not available.",
          ),
        );
      }

      if (listingsResult.status === "fulfilled") {
        setListings(listingsResult.value.data?.content ?? []);
      } else {
        setListings([]);
        nextErrors.push(
          getAdminErrorMessage(
            listingsResult.reason,
            "Listing admin API is not available.",
          ),
        );
      }

      setErrors(nextErrors);
    });

    return () => {
      active = false;
    };
  }, [token]);

  const currency = payment.summary.currency || "USD";
  const revenueFlow = useMemo(
    () =>
      payment.paymentFlow.map((item) => ({
        ...item,
        day: formatDay(item.date),
      })),
    [payment.paymentFlow],
  );
  const reservationStatusRows = useMemo(
    () => buildReservationStatusRows(reservations),
    [reservations],
  );
  const transactionTypes = useMemo(
    () => buildTransactionTypes(payment, reservations),
    [payment, reservations],
  );
  const topBookedListings = useMemo(
    () => buildTopBookedListings(reservations, listings),
    [reservations, listings],
  );
  const completedReservations = reservations.filter(
    (item) => item.status === "COMPLETED",
  ).length;
  const openReservations = reservations.filter((item) =>
    ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"].includes(item.status),
  ).length;
  const returningRate = reservations.length
    ? Math.round((completedReservations / reservations.length) * 100)
    : 0;

  const stats = [
    {
      label: "Captured revenue",
      value: formatCurrency(payment.summary.capturedAmount, currency),
      note: `${payment.summary.paymentCount} paid transactions`,
      href: "/admin/transactions",
      icon: CreditCard,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Refund queue",
      value: payment.summary.refundCount.toLocaleString("en-US"),
      note: formatCurrency(payment.summary.refundedAmount, currency),
      href: "/admin/refunds",
      icon: BadgeDollarSign,
      tone: "bg-rose-50 text-[#ff385c]",
    },
    {
      label: "Open reservations",
      value: openReservations.toLocaleString("en-US"),
      note: `${reservations.length} total reservation rows`,
      href: "/admin/reservations",
      icon: CalendarCheck,
      tone: "bg-blue-50 text-blue-700",
    },
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow="Admin overview"
        title="Operations Dashboard"
        description={getDateRange()}
        action={
          <Button variant="outline" className="h-10 rounded-[8px]">
            <Download className="mr-2 size-4" />
            Download
          </Button>
        }
      />

      <main className="mx-auto max-w-[1440px] space-y-4 p-5 sm:p-8">
        {errors.length ? (
          <AdminErrorState
            title="Some admin data could not be loaded"
            description={errors.join(" ")}
          />
        ) : null}

        <section className="grid gap-3 md:grid-cols-3">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.label}
                className="group relative overflow-hidden rounded-[16px] border-[#dedee6] bg-white py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(16,24,40,0.08)]"
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-[#0b0b0f]" />
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#696b78]">
                      {item.label}
                    </p>
                    <p className="mt-3 truncate text-[30px] font-semibold leading-tight text-[#0b0b0f]">
                      {item.value}
                    </p>
                    <p className="mt-2 truncate text-sm text-[#696b78]">
                      {item.note}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className={cn("size-11 shrink-0 rounded-[14px]", item.tone)}
                  >
                    <Link href={item.href}>
                      <Icon className="size-4" />
                      <span className="sr-only">Open {item.label}</span>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
            <CardHeader>
              <div>
                <CardTitle className="text-base text-[#222222]">
                  Total Revenue
                </CardTitle>
                <CardDescription>Income in the last 28 days</CardDescription>
              </div>
              <CardAction className="flex items-center gap-3">
                <span className="text-sm text-[#6a6a6a]">
                  Captured{" "}
                  {payment.summary.paymentCount.toLocaleString("en-US")}
                </span>
                <span className="text-sm text-[#6a6a6a]">
                  Refunds {payment.summary.refundCount.toLocaleString("en-US")}
                </span>
              </CardAction>
            </CardHeader>
            <CardContent>
              {revenueFlow.length ? (
                <ChartContainer config={revenueConfig} className="h-[350px]">
                  <AreaChart data={revenueFlow}>
                    <CartesianGrid vertical={false} stroke="#eeeeee" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      dataKey="captured"
                      type="natural"
                      fill="rgba(5,5,7,0.08)"
                      stroke="#050507"
                      strokeWidth={2}
                    />
                    <Area
                      dataKey="refunded"
                      type="natural"
                      fill="rgba(166,167,173,0.18)"
                      stroke="#a6a7ad"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <AdminEmptyState
                  title="No revenue chart data"
                  description="Daily payment aggregates will appear here when the payment overview endpoint returns them."
                />
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-[#222222]">
                Reservation Health
              </CardTitle>
              <CardAction>
                <Button asChild variant="outline" className="h-9 rounded-[8px]">
                  <Link href="/admin/reservations">View</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-4xl font-semibold text-[#222222]">
                  {returningRate}%
                </p>
                <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  <TrendingUp className="size-3" />
                  completed stays
                </p>
              </div>
              <div className="rounded-[14px] border border-[#ebebeb] bg-[#f7f7f7] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6a6a6a]">
                    Completion rate
                  </span>
                  <span className="text-sm font-semibold text-[#222222]">
                    {returningRate}%
                  </span>
                </div>
                <Progress value={returningRate} className="mt-3 h-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[14px] border border-[#ebebeb] p-4">
                  <p className="text-sm text-[#6a6a6a]">Open</p>
                  <p className="mt-1 text-xl font-semibold text-[#222222]">
                    {openReservations}
                  </p>
                </div>
                <div className="rounded-[14px] border border-[#ebebeb] p-4">
                  <p className="text-sm text-[#6a6a6a]">Completed</p>
                  <p className="mt-1 text-xl font-semibold text-[#222222]">
                    {completedReservations}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-[#222222]">
                Reservation Status
              </CardTitle>
              <CardDescription>Booking lifecycle distribution</CardDescription>
              <CardAction>
                <Button variant="outline" className="h-9 rounded-[8px]">
                  Export
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {reservationStatusRows.length ? (
                <>
                  <ChartContainer
                    config={reservationStatusConfig}
                    className="h-[260px]"
                  >
                    <BarChart data={reservationStatusRows} layout="vertical">
                      <CartesianGrid horizontal={false} stroke="#eeeeee" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="status"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={126}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="count"
                        fill="#050507"
                        radius={[0, 8, 8, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-4 grid gap-2">
                    {reservationStatusRows.slice(0, 3).map((item) => (
                      <div
                        key={item.status}
                        className="flex items-center justify-between rounded-[10px] bg-[#f7f7f7] px-3 py-2 text-sm"
                      >
                        <span className="text-[#6a6a6a]">{item.status}</span>
                        <span className="font-semibold text-[#222222]">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <AdminEmptyState
                  title="No reservation status data"
                  description="Reservation lifecycle rows will appear here after booking-service returns admin reservations."
                />
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-[#222222]">
                Transaction Types
              </CardTitle>
              <CardDescription>
                Bookings, refunds, payouts and pending work
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionTypes.length ? (
                <>
                  <ChartContainer config={visitsConfig} className="h-[220px]">
                    <PieChart>
                      <Pie
                        data={transactionTypes}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={56}
                        outerRadius={88}
                        paddingAngle={4}
                      >
                        {transactionTypes.map((item, index) => (
                          <Cell
                            key={item.name}
                            fill={pieColors[index % pieColors.length]}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                  <div className="grid grid-cols-2 gap-3">
                    {transactionTypes.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-2 text-sm text-[#6a6a6a]"
                      >
                        <span
                          className="size-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              pieColors[index % pieColors.length],
                          }}
                        />
                        {item.name} {item.count}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <AdminEmptyState
                  title="No transaction type data"
                  description="Booking, refund and payout activity will populate this chart."
                />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-[#222222]">
                Recent Transactions
              </CardTitle>
              <CardAction>
                <Button variant="outline" className="h-9 rounded-[8px]">
                  Export
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Reservation</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.slice(0, 8).map((item) => (
                    <TableRow key={item.bookingId}>
                      <TableCell className="font-semibold text-[#222222]">
                        {displayReservationCode(item)}
                      </TableCell>
                      <TableCell>{displayGuest(item)}</TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium text-[#222222]">Booking</p>
                          <p className="max-w-[280px] truncate text-xs text-[#6a6a6a]">
                            {displayListing(item)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.totalAmount, item.currency)}
                      </TableCell>
                      <TableCell>
                        <TextStatusPill tone={statusTone(item.status)}>
                          {displayStatus(item.status)}
                        </TextStatusPill>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full"
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!reservations.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No reservations returned.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <p className="mt-4 text-sm text-[#6a6a6a]">
                Showing 1 to {Math.min(reservations.length, 8)} of{" "}
                {reservations.length} entries
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-[#222222]">
                Top Booked Listings
              </CardTitle>
              <CardDescription>
                Listings ranked by reservation count
              </CardDescription>
              <CardAction>
                <Button variant="outline" className="h-9 rounded-[8px]">
                  Export
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-2">
              {topBookedListings.length ? (
                topBookedListings.map((item) => (
                  <div
                    key={item.listingId}
                    className="grid grid-cols-[minmax(0,1fr)_76px_64px_32px] items-center gap-3 rounded-[12px] p-2 hover:bg-[#f7f7f7]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-11 rounded-[10px]">
                        <AvatarImage
                          src={item.coverImageUrl}
                          alt={item.title}
                        />
                        <AvatarFallback className="rounded-[10px] bg-[#f7f7f7] text-[#222222]">
                          <Building2 className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#222222]">
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-[#6a6a6a]">
                          {[item.city, item.country]
                            .filter(Boolean)
                            .join(", ") || "No location"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-[#222222]">
                      {item.bookingCount} bookings
                    </p>
                    <p className="text-sm text-[#6a6a6a]">
                      {formatCurrency(item.revenue, item.currency)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full"
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </div>
                ))
              ) : (
                <AdminEmptyState
                  title="No booked listings"
                  description="Listings will rank here after reservations are returned."
                />
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
