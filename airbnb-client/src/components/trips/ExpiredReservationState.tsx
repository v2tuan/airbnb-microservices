import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpiredReservationStateProps {
  title?: string;
  message?: string;
  className?: string;
}

export function ExpiredReservationState({
  title = "Reservation expired",
  message = "This reservation expired because payment was not completed in time.",
  className,
}: ExpiredReservationStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6 sm:py-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
            Payment expired
          </p>
          <h3 className="font-display mt-1 text-lg font-semibold text-slate-900">
            {title}
          </h3>
          <p className="mt-2 text-sm text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  );
}
