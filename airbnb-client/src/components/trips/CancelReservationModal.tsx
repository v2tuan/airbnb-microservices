"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type {
  BookingCancellationPolicy,
  BookingPaymentSummary,
} from "@/types/booking.type";

interface CancelReservationModalProps {
  isOpen: boolean;
  policy: BookingCancellationPolicy | null;
  payment: BookingPaymentSummary | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function CancelReservationModal({
  isOpen,
  policy,
  payment,
  onClose,
  onConfirm,
}: CancelReservationModalProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const reasons = [
    "Plans changed",
    "Found a better option",
    "Personal emergency",
    "Travel restrictions",
    "Accommodation issues",
    "Other",
  ];

  const refundAmount = policy?.refundable
    ? Number(payment?.totalAmount ?? 0)
    : 0;
  const currency = payment?.currency ?? "USD";

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

          <div className="mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total paid</span>
              <span className="font-medium">
                {formatCurrency(Number(payment?.totalAmount ?? 0), currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Estimated refund</span>
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
          </div>

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
            onClick={() => onConfirm(reason)}
            disabled={!reason}
            className="mb-3 w-full rounded-xl bg-rose-500 py-3 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm cancellation
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
