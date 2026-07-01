"use client";

import {
  Banknote,
  CircleDollarSign,
  CreditCard,
  ListChecks,
  RefreshCcw,
  RotateCcw,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
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
  getAdminPaymentOverview,
} from "@/api/endpoints/admin";
import { useAdminToken } from "@/components/admin/admin-shell";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingRows,
  AdminMetricCard,
  AdminPageHeader,
  formatAdminDate,
  getAdminErrorMessage,
  TextStatusPill,
} from "@/components/admin/admin-ui";
import {
  Card,
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
import { formatCurrency } from "@/lib/utils";

const emptyOverview: AdminPaymentOverview = {
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

const paymentFlowConfig = {
  captured: { label: "Captured", color: "#050507" },
  refunded: { label: "Refunded", color: "#a6a7ad" },
  payout: { label: "Payout", color: "#5b5d68" },
} satisfies ChartConfig;

const statusConfig = {
  count: { label: "Transactions", color: "#050507" },
} satisfies ChartConfig;

function statusTone(status: string) {
  const normalized = status.toUpperCase();
  if (["PAID", "COMPLETED", "SUCCEEDED", "CAPTURED"].includes(normalized)) {
    return "success";
  }
  if (["PENDING", "PROCESSING", "RETRY", "SCHEDULED"].includes(normalized)) {
    return "warning";
  }
  if (["FAILED", "CANCELLED", "REFUND_FAILED"].includes(normalized)) {
    return "danger";
  }
  return "neutral";
}

function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function shortCode(value?: string | null) {
  return value ? value.slice(0, 8).toUpperCase() : "N/A";
}

export function TransactionsManagementModule() {
  const { token } = useAdminToken();
  const [overview, setOverview] = useState<AdminPaymentOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getAdminPaymentOverview(token)
      .then((response) => {
        if (!active) return;
        setOverview(response.data ?? emptyOverview);
      })
      .catch((err) => {
        if (!active) return;
        setOverview(emptyOverview);
        setError(
          getAdminErrorMessage(
            err,
            "GET /payments/admin/overview is not available yet.",
          ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const currency = overview.summary.currency || "USD";
  const paymentFlow = useMemo(
    () =>
      overview.paymentFlow.map((item) => ({
        ...item,
        day: formatDay(item.date),
      })),
    [overview.paymentFlow],
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Transactions"
        title="Transaction management"
        description="Monitor captured payments, refund movement, payout aging and payment operations."
      />

      <main className="mx-auto max-w-[1280px] space-y-6 p-5 sm:p-8">
        {error ? <AdminErrorState description={error} /> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="Captured"
            value={formatCurrency(overview.summary.capturedAmount, currency)}
            note={`${overview.summary.paymentCount} successful payments`}
            accent="success"
            icon={CircleDollarSign}
          />
          <AdminMetricCard
            label="Refunded"
            value={formatCurrency(overview.summary.refundedAmount, currency)}
            note={`${overview.summary.refundCount} refund records`}
            accent="brand"
            icon={RotateCcw}
          />
          <AdminMetricCard
            label="Pending payouts"
            value={formatCurrency(
              overview.summary.pendingPayoutAmount,
              currency,
            )}
            note={`${overview.summary.pendingPayoutCount} payout items`}
            accent="warning"
            icon={WalletCards}
          />
          <AdminMetricCard
            label="Queue"
            value={overview.queue.length}
            note="Transactions needing review"
            accent="neutral"
            icon={ListChecks}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-[#222222]">
                <CreditCard className="size-4" />
                Payment flow
              </CardTitle>
              <CardDescription>
                Captured revenue, refunds and payout movement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <AdminLoadingRows rows={4} />
              ) : paymentFlow.length ? (
                <ChartContainer config={paymentFlowConfig} className="h-80">
                  <LineChart data={paymentFlow}>
                    <CartesianGrid
                      vertical={false}
                      stroke="#eeeeee"
                    />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      dataKey="captured"
                      type="monotone"
                      stroke="#050507"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="refunded"
                      type="monotone"
                      stroke="#a6a7ad"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="payout"
                      type="monotone"
                      stroke="#5b5d68"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <AdminEmptyState
                  title="No transaction flow"
                  description="Payment flow data will appear when payment-service returns daily aggregates."
                />
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-[#222222]">
                <WalletCards className="size-4" />
                Status mix
              </CardTitle>
              <CardDescription>Transactions grouped by state.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <AdminLoadingRows rows={4} />
              ) : overview.transactionStatus.length ? (
                <ChartContainer config={statusConfig} className="h-80">
                  <BarChart data={overview.transactionStatus} layout="vertical">
                    <CartesianGrid
                      horizontal={false}
                      stroke="#eeeeee"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="status"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={118}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#050507" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <AdminEmptyState
                  title="No status rows"
                  description="Transaction status counts are currently empty."
                />
              )}
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-[#222222]">
              <Banknote className="size-4" />
              Operations queue
            </CardTitle>
            <CardDescription>
              Payment, refund and payout records requiring admin attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? <AdminLoadingRows /> : null}
            {!loading && !overview.queue.length ? (
              <AdminEmptyState
                title="No transaction work"
                description="There are no payment operation rows in the current queue."
              />
            ) : null}
            {!loading && overview.queue.length ? (
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Record</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.queue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-semibold text-[#222222]">
                          {item.type.replaceAll("_", " ")} {shortCode(item.id)}
                        </p>
                        <p className="text-xs text-[#6a6a6a]">{item.owner}</p>
                      </TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>
                        {item.bookingId
                          ? `Reservation ${shortCode(item.bookingId)}`
                          : "Not linked"}
                      </TableCell>
                      <TableCell>
                        <TextStatusPill tone={statusTone(item.status)}>
                          {item.status}
                        </TextStatusPill>
                      </TableCell>
                      <TableCell>{formatAdminDate(item.createdAt)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount, item.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[14px] border-[#dddddd] bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-[#222222]">
              <RefreshCcw className="size-4" />
              Payout aging
            </CardTitle>
            <CardDescription>Pending payout amount by age.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {overview.payoutAging.length ? (
              overview.payoutAging.map((bucket) => (
                <div
                  key={bucket.bucket}
                  className="rounded-[14px] border border-[#ebebeb] bg-[#f7f7f7] p-4"
                >
                  <p className="text-sm font-semibold text-[#222222]">
                    {bucket.bucket}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[#222222]">
                    {formatCurrency(bucket.amount, currency)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#6a6a6a]">
                No payout aging buckets returned.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
