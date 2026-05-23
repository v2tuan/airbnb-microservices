import { cn } from "@/lib/utils";

interface PaymentCountdownTimerProps {
    minutes: number;
    seconds: number;
    isCritical?: boolean;
    isExpired?: boolean;
    size?: "sm" | "md";
    className?: string;
}

export function PaymentCountdownTimer({
                                          minutes,
                                          seconds,
                                          isCritical = false,
                                          isExpired = false,
                                          size = "md",
                                          className,
                                      }: PaymentCountdownTimerProps) {
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(seconds).padStart(2, "0");

    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 rounded-full border bg-white/80 backdrop-blur",
                size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm",
                isExpired
                    ? "border-slate-200 text-slate-400"
                    : isCritical
                        ? "border-rose-200 text-rose-600 animate-pulse-soft"
                        : "border-amber-200 text-amber-700",
                className
            )}
        >
            <span className="uppercase tracking-wider text-[10px] font-semibold">Time left</span>
            <span className="font-semibold tabular-nums">
        {formattedMinutes}:{formattedSeconds}
      </span>
        </div>
    );
}
