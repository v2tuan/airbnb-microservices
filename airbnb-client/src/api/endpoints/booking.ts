import apiClient from "../client";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

export interface CheckoutRequest {
    roomId: string;
    roomName?: string;
    userId?: string;
    checkInDate: string;   // "YYYY-MM-DD"
    checkOutDate: string;  // "YYYY-MM-DD"
    totalAmount?: number;
    currency: string;      // "usd" hoặc "vnd"
    guestCount?: number;
    guestNotes?: string;
    numberOfAdults?: number;
    numberOfChildren?: number;
    numberOfInfants?: number;
    numberOfPets?: number;
}

export interface CheckoutResponse {
    bookingId: string;
    paymentIntentId: string;
    /** Stripe client secret — dùng để gọi stripe.confirmPayment() */
    clientSecret: string;
    /** Stripe publishable key — dùng để khởi tạo loadStripe() */
    publishableKey: string;
    totalAmount: number;
    currency: string;
    expiresAt: string;   // ISO datetime — booking hết hạn lúc này
    message: string;
}

export type BookingStatus = 'PENDING_PAYMENT' | 'PAID' | 'EXPIRED' | 'CANCELLED';

export interface BookingDetail {
    id: number;
    roomId: number;
    userId: number;
    roomName: string;
    checkInDate: string;
    checkOutDate: string;
    totalNights: number;
    totalAmount: number;
    currency: string;
    status: BookingStatus;
    statusDisplayName: string;
    paymentIntentId?: string;
    createdAt: string;
    expiresAt: string;
    paidAt?: string;
    guestCount: number;
    guestNotes?: string;
    secondsUntilExpiry: number;
}

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
