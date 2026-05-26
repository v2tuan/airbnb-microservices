import { AlarmClock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentCountdownTimer } from "./PaymentCountdownTimer";

interface PendingPaymentBannerProps {
  minutes: number;
  seconds: number;
  isCritical: boolean;
  expiresAt?: string;
  onPayNow?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function PendingPaymentBanner({
  minutes,
  seconds,
  isCritical,
  expiresAt,
  onPayNow,
  onCancel,
  className,
}: PendingPaymentBannerProps) {
  const expiresTime = expiresAt
    ? new Date(expiresAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "soon";

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/90 via-rose-50/70 to-white shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-5 px-5 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <AlarmClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-600 uppercase">
              Payment pending
            </p>
            <h3 className="font-display mt-1 text-lg font-semibold text-slate-900">
              Complete payment to secure your reservation
            </h3>
            <p className="mt-2 text-sm text-amber-700">
              Your reservation is held until {expiresTime}. It will expire if
              payment is not completed in time.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <PaymentCountdownTimer
            minutes={minutes}
            seconds={seconds}
            isCritical={isCritical}
            size="md"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onPayNow}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600"
            >
              Complete payment
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-full border border-amber-200 px-5 py-2.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50"
            >
              Cancel reservation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
