// components/PaymentForm.tsx
// Component xử lý thanh toán với Stripe Elements

import React, { useState } from 'react';
import {
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';

interface PaymentFormProps {
    bookingId: string;
    amount: number;
    currency: string;
    onSuccess: () => void;
    onError: (message: string) => void;
}

/**
 * PaymentForm - Component thu thập thông tin thẻ và xử lý thanh toán.
 *
 * FLOW:
 * 1. Stripe Elements render form thu thập thông tin thẻ (an toàn - không qua server của chúng ta)
 * 2. User điền thông tin thẻ và bấm "Thanh toán"
 * 3. stripe.confirmPayment() gửi thông tin thẻ trực tiếp cho Stripe
 * 4. Stripe xử lý và gọi webhook về Payment Service
 * 5. Payment Service cập nhật payment PAID và booking → CONFIRMED
 *
 * Thẻ test của Stripe:
 * - Thành công: 4242 4242 4242 4242 (bất kỳ exp, CVC)
 * - Thất bại:   4000 0000 0000 0002
 * - 3D Secure:  4000 0025 0000 3155
 */
export default function PaymentForm({
                                        bookingId,
                                        amount,
                                        currency,
                                        onSuccess,
                                        onError,
                                    }: PaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Stripe.js chưa load xong
        if (!stripe || !elements) return;

        setIsLoading(true);
        setErrorMessage(null);

        try {
            /**
             * confirmPayment() thực hiện:
             * 1. Thu thập thông tin thẻ từ PaymentElement
             * 2. Gửi trực tiếp cho Stripe (không qua server của chúng ta)
             * 3. Stripe xử lý thanh toán
             * 4. Redirect về return_url sau khi xong
             *
             * return_url là trang hiển thị kết quả thanh toán
             */
            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    // Redirect về trang success với bookingId trong query params
                    return_url: `${window.location.origin}/payment-result?bookingId=${bookingId}`,
                },
            });

            // Nếu có error ở đây, đó là error TRƯỚC khi redirect (ví dụ: thẻ bị từ chối ngay lập tức)
            // Nếu thanh toán thành công, user sẽ được redirect sang return_url
            if (error) {
                if (error.type === 'card_error' || error.type === 'validation_error') {
                    setErrorMessage(error.message || 'Thanh toán thất bại');
                    onError(error.message || 'Thanh toán thất bại');
                } else {
                    setErrorMessage('Đã có lỗi xảy ra. Vui lòng thử lại.');
                    onError('Unexpected error');
                }
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Đã có lỗi xảy ra');
            onError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const formatAmount = (amount: number, currency: string) => {
        if (currency.toLowerCase() === 'usd') {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
        }
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Stripe Payment Element - tự động render form thu thập thông tin thanh toán */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thông tin thanh toán
                </label>
                <PaymentElement
                    options={{
                        layout: 'tabs',  // Hiển thị dạng tabs (Card, Google Pay, etc.)
                    }}
                />
            </div>

            {/* Hiển thị lỗi */}
            {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <span className="text-red-500 text-xl">⚠️</span>
                    <div>
                        <p className="font-medium text-red-700">Thanh toán thất bại</p>
                        <p className="text-red-600 text-sm">{errorMessage}</p>
                    </div>
                </div>
            )}

            {/* Test Cards Guide */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-700 mb-2">🧪 Thẻ test Stripe:</p>
                <div className="space-y-1 text-xs text-blue-600">
                    <p>✅ <span className="font-mono font-bold">4242 4242 4242 4242</span> - Thành công</p>
                    <p>❌ <span className="font-mono font-bold">4000 0000 0000 0002</span> - Bị từ chối</p>
                    <p>🔐 <span className="font-mono font-bold">4000 0025 0000 3155</span> - 3D Secure</p>
                    <p className="mt-1 text-gray-500">Dùng bất kỳ ngày hết hạn tương lai và CVC 3 chữ số</p>
                </div>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={!stripe || !elements || isLoading}
                className={`
          w-full py-4 px-6 rounded-xl font-semibold text-white text-lg
          transition-all duration-200
          ${isLoading || !stripe
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#FF385C] hover:bg-[#E61E4D] active:scale-[0.99] shadow-lg hover:shadow-xl'
                }
        `}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Đang xử lý...
          </span>
                ) : (
                    `Thanh toán ${formatAmount(amount, currency)}`
                )}
            </button>

            <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
                <span>🔒</span>
                Thanh toán được bảo mật bởi Stripe. Thông tin thẻ không được lưu trên server của chúng tôi.
            </p>
        </form>
    );
}
