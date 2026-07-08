"use client";

import {
  AlertCircle,
  ArrowDownToLine,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { getHostReservations } from "@/api/endpoints/booking";
import {
  type HostIncomeTransaction,
  listHostIncomeTransactions,
} from "@/api/endpoints/host";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authStorage } from "@/lib/auth-storage";
import { hasRealmRole, parseJwt } from "@/lib/jwt";
import { cn, formatCurrency } from "@/lib/utils";
import type { RootState } from "@/store";
import type { HostReservationResponse } from "@/types/booking.type";

const PAGE_SIZE = 8;
const loadingRows = Array.from({ length: 6 }, (_, index) => index);
const loadingColumns = ["amount", "listing", "method", "date", "status"];

function statusTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (
    ["PENDING_CHECKIN", "SCHEDULED", "PROCESSING", "RETRY"].includes(normalized)
  ) {
    return "bg-amber-50 text-amber-700";
  }
  if (["FAILED", "CANCELLED"].includes(normalized)) {
    return "bg-rose-50 text-rose-700";
  }
  return "bg-neutral-100 text-neutral-700";
}

function formatTransactionDate(value?: string | null) {
  if (!value) return "Not scheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isCompleted(transaction: HostIncomeTransaction) {
  return transaction.status?.toUpperCase() === "COMPLETED";
}

function isPending(transaction: HostIncomeTransaction) {
  return ["PENDING_CHECKIN", "SCHEDULED", "PROCESSING", "RETRY"].includes(
    transaction.status?.toUpperCase(),
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof CircleDollarSign;
}) {
  return (
    <div className="rounded-[18px] border border-[#ebebeb] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#6a6a6a]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#222222]">
            {value}
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-full bg-[#fff1f3] text-[#ff385c]">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-[#6a6a6a]">{detail}</p>
    </div>
  );
}

export default function HostTransactionsPage() {
  const reduxToken = useSelector((state: RootState) => state.auth.token);
  const [storageToken, setStorageToken] = useState<string | null>(null);
  const [authStorageChecked, setAuthStorageChecked] = useState(false);
  const [transactions, setTransactions] = useState<HostIncomeTransaction[]>([]);
  const [reservations, setReservations] = useState<HostReservationResponse[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const effectiveToken = reduxToken ?? storageToken;
  const isHost = useMemo(
    () => !!effectiveToken && hasRealmRole(effectiveToken, "HOST"),
    [effectiveToken],
  );
  const hostId = useMemo(
    () => (effectiveToken ? parseJwt(effectiveToken)?.sub : undefined),
    [effectiveToken],
  );

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
    let active = true;

    async function loadTransactions() {
      if (!effectiveToken || !isHost || !hostId) {
        if (!authStorageChecked) return;
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const [incomeData, reservationsResponse] = await Promise.all([
          listHostIncomeTransactions(effectiveToken, hostId),
          getHostReservations(effectiveToken, {
            page: 0,
            size: 500,
          }),
        ]);
        if (!active) return;
        setTransactions(incomeData);
        setReservations(reservationsResponse.data?.content ?? []);
        setPage(1);
      } catch {
        if (!active) return;
        setTransactions([]);
        setReservations([]);
        setError("Unable to load host income transactions.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTransactions();

    return () => {
      active = false;
    };
  }, [authStorageChecked, effectiveToken, hostId, isHost]);

  const currency =
    transactions.find((transaction) => transaction.currency)?.currency ?? "USD";
  const completedIncome = transactions
    .filter(isCompleted)
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const pendingIncome = transactions
    .filter(isPending)
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const failedCount = transactions.filter((transaction) =>
    ["FAILED", "CANCELLED"].includes(transaction.status?.toUpperCase()),
  ).length;
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const reservationsByBookingId = useMemo(
    () =>
      new Map(
        reservations.map((reservation) => [
          reservation.reservationId,
          reservation,
        ]),
      ),
    [reservations],
  );
  const visibleTransactions = transactions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  if (authStorageChecked && !loading && (!effectiveToken || !isHost)) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-[18px] border border-[#ebebeb] bg-white p-8 text-center">
          <AlertCircle className="mx-auto size-10 text-[#ff385c]" />
          <h1 className="mt-4 text-2xl font-semibold text-[#222222]">
            Host access required
          </h1>
          <p className="mt-2 text-sm text-[#6a6a6a]">
            Sign in with a host account to view income transactions.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] px-4 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#ff385c]">
              Host income
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#222222]">
              Transactions
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#6a6a6a]">
              Track payout income for your bookings after platform fees.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Completed income"
            value={formatCurrency(completedIncome, currency)}
            detail="Paid out to your connected account"
            icon={CircleDollarSign}
          />
          <SummaryCard
            label="Pending income"
            value={formatCurrency(pendingIncome, currency)}
            detail="Waiting for check-in, schedule, or retry"
            icon={CalendarDays}
          />
          <SummaryCard
            label="Transactions"
            value={String(transactions.length)}
            detail="Payout records returned by payment-service"
            icon={ArrowDownToLine}
          />
          <SummaryCard
            label="Needs attention"
            value={String(failedCount)}
            detail="Failed or cancelled payout records"
            icon={AlertCircle}
          />
        </section>

        {error ? (
          <div className="rounded-[14px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[18px] border border-[#ebebeb] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#ebebeb] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#222222]">
                Income records
              </h2>
              <p className="text-sm text-[#6a6a6a]">
                {transactions.length
                  ? `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, transactions.length)} of ${transactions.length}`
                  : "No records to display"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="border-b border-[#ebebeb] bg-[#fafafa] text-xs uppercase text-[#6a6a6a]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Listing</th>
                  <th className="px-5 py-3 font-semibold">Method</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? loadingRows.map((row) => (
                      <tr key={row} className="border-b border-[#f1f1f1]">
                        {loadingColumns.map((column) => (
                          <td key={column} className="px-5 py-4">
                            <Skeleton className="h-5 w-full max-w-[160px] rounded-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : visibleTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-[#f1f1f1] last:border-0"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[#222222]">
                            {formatCurrency(
                              Number(transaction.amount ?? 0),
                              transaction.currency,
                            )}
                          </div>
                          <div className="text-xs uppercase text-[#6a6a6a]">
                            {transaction.currency}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {(() => {
                            const reservation = reservationsByBookingId.get(
                              transaction.bookingId,
                            );
                            const listingTitle =
                              reservation?.listingTitle?.trim() ||
                              "Listing title unavailable";

                            return (
                              <>
                                <Link
                                  href={`/host/reservations/${transaction.bookingId}`}
                                  className="font-medium text-[#222222] underline-offset-4 hover:underline"
                                >
                                  {listingTitle}
                                </Link>
                                <p className="mt-1 max-w-[300px] truncate text-xs text-[#6a6a6a]">
                                  {reservation?.reservationCode
                                    ? `${reservation.reservationCode} · ${transaction.bookingId}`
                                    : transaction.bookingId}
                                </p>
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-4 text-[#4a4a4a]">
                          {transaction.payoutMethod?.replaceAll("_", " ") ??
                            "Payout"}
                        </td>
                        <td className="px-5 py-4 text-[#4a4a4a]">
                          {formatTransactionDate(transaction.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "rounded-full px-3 py-1 font-semibold",
                              statusTone(transaction.status),
                            )}
                          >
                            {transaction.status.replaceAll("_", " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {!loading && transactions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CircleDollarSign className="mx-auto size-10 text-[#b0b0b0]" />
              <h3 className="mt-4 text-lg font-semibold text-[#222222]">
                No income transactions yet
              </h3>
              <p className="mt-2 text-sm text-[#6a6a6a]">
                Completed guest payments will create payout records here.
              </p>
            </div>
          ) : null}

          {!loading && transactions.length > 0 ? (
            <div className="flex items-center justify-between border-t border-[#ebebeb] px-5 py-4">
              <p className="text-sm text-[#6a6a6a]">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
