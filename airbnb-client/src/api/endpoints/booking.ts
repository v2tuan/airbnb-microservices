import type { ApiResponse } from "@/types/api.type";
import type {
  BookingDetailResponse,
  BookingFilterType,
  BookingStatus,
  BookingTripsResponse,
  CheckoutRequest,
  CheckoutResponse,
} from "@/types/booking.type";
import apiClient from "../client";

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
export async function checkout(
  token: string | null,
  data: CheckoutRequest,
): Promise<CheckoutResponse> {
  const res = await apiClient.post(`${prefix}/payments/checkout`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function getMyBookings(
  token: string | null,
  type: BookingFilterType = "ALL",
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

export async function getBookingDetail(
  token: string | null,
  bookingId: string,
): Promise<ApiResponse<BookingDetailResponse>> {
  const res = await apiClient.get(`${prefix}/bookings/${bookingId}/detail`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
}

export async function cancelBooking(
  token: string | null,
  bookingId: string,
  reason: string,
): Promise<ApiResponse<{ status: BookingStatus }>> {
  const res = await apiClient.post(
    `${prefix}/bookings/${bookingId}/cancel`,
    { reason },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return res.data;
}
