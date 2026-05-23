"use client";
import { useEffect, useState } from "react";

const getRemainingMs = (expiresAt?: string) => {
    if (!expiresAt) return 0;
    return Math.max(0, new Date(expiresAt).getTime() - Date.now());
};

export function usePaymentCountdown(expiresAt?: string) {
    const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(expiresAt));

    useEffect(() => {
        if (!expiresAt) {
            setRemainingMs(0);
            return;
        }

        const tick = () => setRemainingMs(getRemainingMs(expiresAt));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    const minutes = Math.max(0, Math.floor(remainingMs / 60000));
    const seconds = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
    const isExpired = remainingMs <= 0;
    const isCritical = remainingMs > 0 && remainingMs <= 5 * 60 * 1000;

    return { remainingMs, minutes, seconds, isExpired, isCritical };
}
