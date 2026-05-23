import apiClient from "../client";
import {ApiResponse} from "@/types/api.type";
import {BookingFilterType, BookingTripsResponse, CheckoutRequest, CheckoutResponse} from "@/types/booking.type";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

/**
 * 1 call → tạo Booking + PaymentIntent.
 *
 * Backend:
 *  1. Gọi Booking Service → tạo Booking (PENDING_PAYMENT)
 *  2. Tạo Stripe PaymentIntent với metadata.bookingId
 *  3. Trả về clientSecret + bookingId
 *
 * Frontend sau đó dùng clientSecret để gọi stripe.confirmPayment().
 */
export async function checkout(token : string | null, data: CheckoutRequest): Promise<CheckoutResponse> {
    const res = await apiClient.post(`${prefix}/payments/checkout`, data, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
}

export async function getMyBookings(
    token: string | null,
    type: BookingFilterType = "ALL"
): Promise<ApiResponse<BookingTripsResponse[]>> {
    const res = await apiClient.get(`${prefix}/bookings/me`, {
        params: {
            type,
        },
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return res.data;
}