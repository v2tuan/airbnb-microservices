"use client";

import {
    CardElement,
    useStripe,
    useElements, PaymentElement,
} from "@stripe/react-stripe-js";
import React from "react";
import {Button} from "@/components/ui/button";
import {BookingIntent} from "@/components/checkout/CheckoutContent";
import {checkout} from "@/api/endpoints/booking";
import {useSelector} from "react-redux";
import type {RootState} from "@/store";

type CardFormProps = {
    roomId: string
    bookingIntent: BookingIntent
}

export default function PaymentForm({roomId, bookingIntent} : CardFormProps) {

    const stripe = useStripe();
    const elements = useElements();

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const token = useSelector((state: RootState) => state.auth.token);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null)

        // Stripe.js chưa load xong
        if (!stripe || !elements) return;

        try {
            const resp = await checkout(token, {
                roomId:       roomId,
                checkInDate:  bookingIntent.checkin,
                checkOutDate: bookingIntent.checkout,
                numberOfAdults: bookingIntent.numberOfAdults,
                numberOfChildren: bookingIntent.numberOfChildren,
                numberOfInfants: bookingIntent.numberOfInfants,
                numberOfPets: bookingIntent.numberOfPets,
                currency: bookingIntent.guestCurrency
            });

            const clientSecret = resp.clientSecret;

            const { error: submitError } = await elements.submit();

            if (submitError) {
                console.log(submitError);
                setError(submitError.message?.toString() || null)
                return;
            }

            const { error } = await stripe.confirmPayment({
                elements,
                clientSecret,
                confirmParams: {
                    // Redirect về trang success với bookingId trong query params
                    return_url: `${window.location.origin}/users/profile/past-trips`,
                },
            });

            // Nếu có error ở đây, đó là error TRƯỚC khi redirect (ví dụ: thẻ bị từ chối ngay lập tức)
            // Nếu thanh toán thành công, user sẽ được redirect sang return_url
            if (error) {
                if (error.type === 'card_error' || error.type === 'validation_error') {
                    setError(error.message || 'Thanh toán thất bại');
                } else {
                    setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Đã có lỗi xảy ra');
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">

            {/*<CardElement  />*/}

            <PaymentElement
            />

            {/* Hiển thị lỗi */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <span className="text-red-500 text-xl">⚠️</span>
                    <div>
                        <p className="font-medium text-red-700">Thanh toán thất bại</p>
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                </div>
            )}

            <Button
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                className={`
                h-10
        w-full
        py-5
        text-lg
        font-semibold
        text-white
        rounded-xl
        bg-gradient-to-r from-[#FF385C] to-[#D70066]
        hover:opacity-90
        active:scale-[0.99]
        transition-all
        shadow-md
        ${loading || !stripe
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'active:scale-[0.99] shadow-lg hover:shadow-xl'
                }
    `}
            >
                {loading ? "Đang xử lý..." : "Xác nhận và thanh toán"}
            </Button>

        </div>
    );
}