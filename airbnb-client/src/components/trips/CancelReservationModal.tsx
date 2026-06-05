"use client";

import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type {
  BookingCancellationPolicy,
  BookingPaymentSummary,
  GuestCancellationQuoteResponse,
} from "@/types/booking.type";

interface CancelReservationModalProps {
  isOpen: boolean;
  policy: BookingCancellationPolicy | null;
  payment: BookingPaymentSummary | null;
  quote: GuestCancellationQuoteResponse | null;
  quoteLoading?: boolean;
  quoteError?: string | null;
  submitting?: boolean;
  onClose: () => void;
  onRetryQuote: () => void;
  onConfirm: (reason: string, quoteId: string) => void;
}

export function CancelReservationModal({
  isOpen,
  policy,
  payment,
  quote,
  quoteLoading = false,
  quoteError,
  submitting = false,
  onClose,
  onRetryQuote,
  onConfirm,
}: CancelReservationModalProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  if (!isOpen) return null;

  const reasons = [
    "Plans changed",
    "Found a better option",
    "Personal emergency",
    "Travel restrictions",
    "Accommodation issues",
    "Other",
  ];

  const currency = quote?.currency ?? payment?.currency ?? "USD";
  const refundAmount = Number(quote?.refundAmount ?? 0);
  const quoteExpired = quote ? new Date(quote.expiresAt).getTime() <= Date.now() : false;
  const canConfirm = Boolean(reason && quote && !quoteExpired && !quoteLoading && !submitting);
  const quoteExpiresAt = quote
    ? new Date(quote.expiresAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-slate-100 border-b p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Cancel reservation
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-start gap-4 rounded-xl bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Review the cancellation policy
              </p>
              <p className="mt-1 text-sm text-amber-700">
                {policy?.description ?? "Cancellation policy is not available."}
              </p>
            </div>
          </div>

          {quoteLoading ? (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-100 p-4 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculating your cancellation quote...
            </div>
          ) : quoteError ? (
            <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">{quoteError}</p>
              <button
                type="button"
                onClick={onRetryQuote}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-700 underline underline-offset-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </button>
            </div>
          ) : quote ? (
            <div className="mb-6 space-y-3 rounded-xl border border-slate-100 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total paid</span>
                <span className="font-medium">
                  {formatCurrency(Number(payment?.totalAmount ?? 0), currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Accommodation refund</span>
                <span className="font-medium">
                  {formatCurrency(Number(quote.accommodationRefund), currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Cleaning fee refund</span>
                <span className="font-medium">
                  {formatCurrency(Number(quote.cleaningFeeRefund), currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Service fee refund</span>
                <span className="font-medium">
                  {formatCurrency(Number(quote.serviceFeeRefund), currency)}
                </span>
              </div>
              {Number(quote.taxesRefund) > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Taxes refund</span>
                  <span className="font-medium">
                    {formatCurrency(Number(quote.taxesRefund), currency)}
                  </span>
                </div>
              ) : null}
              <div className="border-slate-100 border-t pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Non-refundable</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(Number(quote.nonRefundableAmount), currency)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-900">Refund amount</span>
                  <span
                    className={`font-semibold ${
                      refundAmount > 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {refundAmount > 0
                      ? formatCurrency(refundAmount, currency)
                      : "No refund"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Quote expires at {quoteExpiresAt}. Confirming after expiry
                  requires a new quote.
                </p>
              </div>
            </div>
          ) : null}

          <p className="mb-3 text-sm text-slate-600">Reason for cancellation</p>
          <div className="mb-6 grid grid-cols-2 gap-2">
            {reasons.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setReason(item)}
                className={`rounded-xl border p-3 text-sm font-medium transition-all ${
                  reason === item
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => quote && onConfirm(reason, quote.quoteId)}
            disabled={!canConfirm}
            className="mb-3 w-full rounded-xl bg-rose-500 py-3 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Cancelling..." : quoteExpired ? "Quote expired" : "Confirm cancellation"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2.5 text-sm text-slate-600 transition-colors hover:text-slate-900"
          >
            Keep reservation
          </button>
        </div>
      </div>
    </div>
  );
}
