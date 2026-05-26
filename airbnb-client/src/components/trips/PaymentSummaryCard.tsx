import { CreditCard, Download, ReceiptText } from "lucide-react";
import { formatCurrency, getNights } from "@/lib/utils";
import type { BookingPaymentSummary } from "@/types/booking.type";
import { BookingStatusBadge, type PaymentStatus } from "./BookingStatusBadge";

interface PaymentSummaryCardProps {
  payment: BookingPaymentSummary | null;
  paymentStatus: PaymentStatus;
  checkIn: string;
  checkOut: string;
  onDownload?: () => void;
}

export function PaymentSummaryCard({
  payment,
  paymentStatus,
  checkIn,
  checkOut,
  onDownload,
}: PaymentSummaryCardProps) {
  if (!payment) return null;

  const nights = Math.max(1, getNights(checkIn, checkOut));
  const nightlyRate = Math.round(
    Number(payment.accommodationAmount ?? 0) / nights,
  );
  const isPaid = paymentStatus === "paid";
  const paymentMeta =
    paymentStatus === "paid"
      ? "Charged at booking"
      : paymentStatus === "pending"
        ? "Charge pending"
        : "Updated on original payment method";
  const paymentRows = [
    {
      label: "Stripe status",
      value: payment.stripePaymentStatus ?? "Not available",
    },
    {
      label: "Payment intent",
      value: payment.stripePaymentIntentId ?? "Not available",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-display font-semibold text-slate-900">
          Payment summary
        </h3>
        <BookingStatusBadge status={paymentStatus} size="sm" />
      </div>

      {paymentStatus === "pending" ? (
        <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-700">
          Payment is pending. Complete payment to confirm this reservation.
        </div>
      ) : null}

      <div className="mb-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">
            {formatCurrency(nightlyRate, payment.currency)} x {nights} nights
          </span>
          <span className="font-medium text-slate-900">
            {formatCurrency(
              Number(payment.accommodationAmount ?? 0),
              payment.currency,
            )}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Cleaning fee</span>
          <span className="font-medium text-slate-900">
            {formatCurrency(Number(payment.cleaningFee ?? 0), payment.currency)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Service fee</span>
          <span className="font-medium text-slate-900">
            {formatCurrency(Number(payment.serviceFee ?? 0), payment.currency)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Taxes</span>
          <span className="font-medium text-slate-900">
            {formatCurrency(Number(payment.taxes ?? 0), payment.currency)}
          </span>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-3">
          <span className="font-semibold text-slate-900">Total</span>
          <span className="text-lg font-bold text-slate-900">
            {formatCurrency(Number(payment.totalAmount ?? 0), payment.currency)}
          </span>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
          <CreditCard className="h-4 w-4 text-slate-700" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">Stripe payment</p>
          <p className="text-xs text-slate-500">{paymentMeta}</p>
        </div>
      </div>

      {payment.refundPolicy ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-slate-100 p-3">
          <ReceiptText className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
          <p className="text-xs leading-relaxed text-slate-600">
            {payment.refundPolicy}
          </p>
        </div>
      ) : null}

      {onDownload && isPaid ? (
        <button
          type="button"
          onClick={onDownload}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Download receipt
        </button>
      ) : null}
    </div>
  );
}
