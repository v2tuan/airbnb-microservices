// components/CountdownTimer.tsx
// Hiển thị đếm ngược thời gian còn lại để thanh toán

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
    secondsRemaining: number;
    onExpire?: () => void;
}

/**
 * CountdownTimer - Đếm ngược thời gian thanh toán.
 *
 * Khi booking ở trạng thái PENDING_PAYMENT, hiển thị countdown
 * để nhắc nhở user thanh toán trong 15 phút.
 */
export default function CountdownTimer({ secondsRemaining, onExpire }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState(secondsRemaining);

    useEffect(() => {
        setTimeLeft(secondsRemaining);
    }, [secondsRemaining]);

    useEffect(() => {
        if (timeLeft <= 0) {
            onExpire?.();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onExpire?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, onExpire]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const isUrgent = timeLeft < 120; // < 2 phút thì hiển thị màu đỏ

    if (timeLeft <= 0) {
        return (
            <div className="flex items-center gap-2 text-red-600 font-semibold">
                <span>⏰</span>
                <span>Đã hết thời gian thanh toán</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 font-mono font-bold text-lg ${isUrgent ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
            <span>⏱</span>
            <span>
        Còn lại: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
            {isUrgent && <span className="text-sm font-normal text-red-400">(Sắp hết hạn!)</span>}
        </div>
    );
}
