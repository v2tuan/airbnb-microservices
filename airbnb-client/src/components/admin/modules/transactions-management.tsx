"use client";

import { Calendar, MoreHorizontal, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type AdminPaymentOverview,
  type AdminReservationSummary,
  type AdminTransactionRecord,
  getAdminPaymentOverview,
  listAdminReservations,
  listAdminTransactions,
} from "@/api/endpoints/admin";
import { useAdminToken } from "@/components/admin/admin-shell";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingRows,
  formatAdminDate,
  getAdminErrorMessage,
  TextStatusPill,
} from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";

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

type TransactionTab = "PAYMENTS" | "PAYOUTS" | "REFUNDS";

const tabs: Array<{ label: string; value: TransactionTab }> = [
  { label: "Payments", value: "PAYMENTS" },
  { label: "Payouts", value: "PAYOUTS" },
  { label: "Refunds", value: "REFUNDS" },
];
const PAGE_SIZE = 10;

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

function rowTypeMatches(item: AdminTransactionRecord, tab: TransactionTab) {
  const type = item.type.toUpperCase();
  if (tab === "PAYMENTS") return type.includes("PAYMENT");
  if (tab === "PAYOUTS") return type.includes("PAYOUT");
  return type.includes("REFUND");
}

function countRowsByStatus(rows: AdminTransactionRecord[], statuses: string[]) {
  const normalizedStatuses = statuses.map((status) => status.toUpperCase());
  return rows.filter((item) =>
    normalizedStatuses.some((status) =>
      item.status.toUpperCase().includes(status),
    ),
  ).length;
}

function sumRowsByStatus(rows: AdminTransactionRecord[], statuses: string[]) {
  const normalizedStatuses = statuses.map((status) => status.toUpperCase());
  return rows
    .filter((item) =>
      normalizedStatuses.some((status) =>
        item.status.toUpperCase().includes(status),
      ),
    )
    .reduce((sum, item) => sum + (item.amount ?? 0), 0);
}

function buildSummaryCards(
  overview: AdminPaymentOverview,
  tab: TransactionTab,
  currency: string,
  rows: AdminTransactionRecord[],
) {
  if (tab === "PAYOUTS") {
    return [
      { label: "All", value: rows.length },
      {
        label: "Completed",
        value: formatCurrency(sumRowsByStatus(rows, ["COMPLETED"]), currency),
      },
      { label: "Processing", value: countRowsByStatus(rows, ["PROCESSING"]) },
      { label: "Failed", value: countRowsByStatus(rows, ["FAILED"]) },
    ];
  }

  if (tab === "REFUNDS") {
    return [
      { label: "All", value: rows.length || overview.summary.refundCount },
      {
        label: "Refunded",
        value: formatCurrency(
          rows.length
            ? sumRowsByStatus(rows, ["COMPLETED", "SUCCEEDED"])
            : overview.summary.refundedAmount,
          currency,
        ),
      },
      { label: "Pending", value: countRowsByStatus(rows, ["PENDING"]) },
      { label: "Failed", value: countRowsByStatus(rows, ["FAILED"]) },
    ];
  }

  return [
    { label: "All", value: rows.length || overview.summary.paymentCount },
    {
      label: "Succeeded",
      value: formatCurrency(
        rows.length
          ? sumRowsByStatus(rows, [
              "PAID",
              "COMPLETED",
              "SUCCEEDED",
              "CAPTURED",
            ])
          : overview.summary.capturedAmount,
        currency,
      ),
    },
    { label: "Refunded", value: overview.summary.refundCount },
    { label: "Failed", value: countRowsByStatus(rows, ["FAILED"]) },
  ];
}

function filterRows(
  rows: AdminTransactionRecord[],
  reservationsByBookingId: Map<string, AdminReservationSummary>,
  tab: TransactionTab,
  search: string,
) {
  const normalizedSearch = search.trim().toLowerCase();
  return rows
    .filter((item) => rowTypeMatches(item, tab))
    .filter((item) => {
      if (!normalizedSearch) return true;
      const reservation = item.bookingId
        ? reservationsByBookingId.get(item.bookingId)
        : undefined;
      const customerName =
        tab === "PAYOUTS" ? reservation?.hostName : reservation?.guestName;
      return [
        item.id,
        item.type,
        item.bookingId,
        customerName,
        item.status,
        item.currency,
        item.description,
        item.providerId,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch),
        );
    });
}

export function TransactionsManagementModule() {
  const { token } = useAdminToken();
  const [overview, setOverview] = useState<AdminPaymentOverview>(emptyOverview);
  const [reservations, setReservations] = useState<AdminReservationSummary[]>(
    [],
  );
  const [transactions, setTransactions] = useState<AdminTransactionRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TransactionTab>("PAYMENTS");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const reservationsByBookingId = useMemo(
    () =>
      new Map(
        reservations.map((reservation) => [reservation.bookingId, reservation]),
      ),
    [reservations],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getAdminPaymentOverview(token),
      listAdminTransactions(token),
      listAdminReservations(token, { page: 0, size: 200 }),
    ])
      .then(
        ([overviewResponse, transactionsResponse, reservationsResponse]) => {
          if (!active) return;
          setOverview(overviewResponse.data ?? emptyOverview);
          setTransactions(transactionsResponse.data ?? []);
          setReservations(reservationsResponse.data ?? []);
        },
      )
      .catch((err) => {
        if (!active) return;
        setOverview(emptyOverview);
        setTransactions([]);
        setReservations([]);
        setError(
          getAdminErrorMessage(
            err,
            "GET /payments/admin/transactions is not available yet.",
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
  const rows = useMemo(
    () => filterRows(transactions, reservationsByBookingId, activeTab, search),
    [activeTab, reservationsByBookingId, transactions, search],
  );
  const rowCurrency = rows.find((item) => item.currency)?.currency || currency;
  const summaryCards = useMemo(
    () => buildSummaryCards(overview, activeTab, rowCurrency, rows),
    [activeTab, rowCurrency, overview, rows],
  );
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [page, rows]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <main className="min-h-screen bg-white text-[#1a2b49]">
      <div className="mx-auto max-w-[1520px] px-5 py-4 sm:px-8">
        <div className="flex flex-col gap-4 border-b border-[#d9e2ef] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-[460px] flex-1">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#526680]" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search"
              className="h-11 rounded-[8px] border-0 bg-[#f3f6fb] pl-11 text-[#1a2b49] shadow-none focus-visible:ring-[#635bff]"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#172033]">
                Transactions
              </h1>
              <div className="mt-5 flex flex-wrap gap-7 border-b border-[#d9e2ef]">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.value);
                      setPage(1);
                    }}
                    className={cn(
                      "-mb-px border-b-2 px-0 pb-3 text-sm font-semibold transition",
                      activeTab === tab.value
                        ? "border-[#635bff] text-[#635bff]"
                        : "border-transparent text-[#314766] hover:text-[#172033]",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error ? <AdminErrorState description={error} /> : null}

          <div className="flex items-center justify-between rounded-[8px] bg-[#f4f7fb] px-5 py-4 text-sm text-[#314766]">
            <p>
              Payment operations are grouped by payment, payout, and refund
              activity.
            </p>
            <button
              type="button"
              className="rounded-[6px] p-1 text-[#526680] hover:bg-white"
              aria-label="Dismiss transaction note"
            >
              <X className="size-4" />
            </button>
          </div>

          <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card, index) => (
              <button
                key={card.label}
                type="button"
                className={cn(
                  "min-h-[86px] rounded-[8px] border bg-white p-4 text-left transition hover:border-[#b8c6d9]",
                  index === 0
                    ? "border-[#635bff] ring-1 ring-[#635bff]"
                    : "border-[#d9e2ef]",
                )}
              >
                <p
                  className={cn(
                    "text-sm font-semibold",
                    index === 0 ? "text-[#635bff]" : "text-[#314766]",
                  )}
                >
                  {card.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-[#314766]">
                  {card.value}
                </p>
              </button>
            ))}
          </section>

          <div className="border-b border-[#d9e2ef] pb-3">
            <div className="text-sm text-[#526680]">
              {rows.length
                ? `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, rows.length)} of ${rows.length} records`
                : "No records to display"}
            </div>
          </div>

          <div className="overflow-hidden rounded-[8px] border border-[#d9e2ef] bg-white">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-5">
                  <AdminLoadingRows rows={8} />
                </div>
              ) : rows.length ? (
                <Table className="min-w-[1080px]">
                  <TableHeader>
                    <TableRow className="border-[#e6edf5] bg-white hover:bg-white">
                      <TableHead className="w-10">
                        <span className="block size-4 rounded-[4px] border border-[#c8d5e4]" />
                      </TableHead>
                      <TableHead className="text-[#172033]">Amount</TableHead>
                      <TableHead className="text-[#172033]">
                        Payment method
                      </TableHead>
                      <TableHead className="text-[#172033]">
                        Description
                      </TableHead>
                      <TableHead className="text-[#172033]">Customer</TableHead>
                      <TableHead className="text-[#172033]">Date</TableHead>
                      <TableHead className="text-[#172033]">Status</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.map((item) => (
                      <TableRow
                        key={item.id}
                        className="border-[#e6edf5] hover:bg-[#f7f9fc]"
                      >
                        <TableCell>
                          <span className="block size-4 rounded-[4px] border border-[#c8d5e4]" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-[#172033]">
                              {formatCurrency(item.amount, item.currency)}
                            </span>
                            <span className="text-xs font-semibold uppercase text-[#526680]">
                              {item.currency}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="rounded-[4px] bg-[#1a32c8] px-1.5 py-1 text-[10px] font-bold uppercase text-white">
                              Stripe
                            </span>
                            <span className="text-[#526680]">
                              {item.paymentMethod || "Gateway"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="max-w-[360px] truncate text-[#314766]">
                            {item.description ||
                              (item.bookingId
                                ? `Booking #${item.bookingId}`
                                : `${item.type.replaceAll("_", " ")} #${item.id}`)}
                          </p>
                        </TableCell>
                        <TableCell className="text-[#314766]">
                          {(() => {
                            const reservation = item.bookingId
                              ? reservationsByBookingId.get(item.bookingId)
                              : undefined;
                            if (item.type.toUpperCase().includes("PAYOUT")) {
                              return reservation?.hostName?.trim() || "Host";
                            }
                            return reservation?.guestName?.trim() || "Guest";
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-[#314766]">
                            <Calendar className="size-3.5 text-[#526680]" />
                            {formatAdminDate(item.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TextStatusPill tone={statusTone(item.status)}>
                            {item.status}
                          </TextStatusPill>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-[#526680]"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8">
                  <AdminEmptyState
                    title={`No ${tabs.find((tab) => tab.value === activeTab)?.label.toLowerCase()}`}
                    description="No matching transaction records were returned by payment-service."
                  />
                </div>
              )}
            </div>
            {!loading && rows.length ? (
              <div className="flex items-center justify-between border-t border-[#e6edf5] px-5 py-4">
                <p className="text-sm text-[#526680]">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-[8px]"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-[8px]"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
