import type { ApiResponse } from "@/types/api.type";
import type {
  BookingDetailResponse,
  BookingFilterType,
  BookingStatus,
  BookingTripsResponse,
  CheckoutRequest,
  CheckoutResponse,
  HostReservationDetailResponse,
  HostReservationResponse,
  HostReservationsPageResponse,
  HostReservationsQuery,
  UpdateReservationStatusRequest,
} from "@/types/booking.type";
import apiClient from "../client";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

/**
 * 1 call -> tạo Booking + PaymentIntent.
 * Backend tạo booking PENDING_PAYMENT, tạo Stripe PaymentIntent và trả clientSecret cho client xác nhận thanh toán.
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
    params: { type },
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
}

export async function getBookingDetail(
  token: string | null,
  bookingId: string,
): Promise<ApiResponse<BookingDetailResponse>> {
  const res = await apiClient.get(`${prefix}/bookings/${bookingId}/detail`, {
    headers: { Authorization: `Bearer ${token}` },
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
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

/**
 * API cũ theo một listing cụ thể, vẫn giữ để các màn/flow khác không bị breaking change.
 * Dashboard mới không dùng endpoint này cho scope "All listings" vì Promise.all ở frontend
 * không thể backend pagination đúng trên toàn bộ portfolio.
 */
export async function getHostReservationsByListing(
  token: string | null,
  listingId: string,
  statuses?: BookingStatus[],
): Promise<ApiResponse<HostReservationResponse[]>> {
  const params = new URLSearchParams();

  statuses?.forEach((status) => {
    params.append("statuses", status);
  });

  const query = params.toString();
  const res = await apiClient.get(
    `${prefix}/bookings/host/listings/${listingId}/reservations${query ? `?${query}` : ""}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

/**
 * API production cho host reservations dashboard.
 * Backend aggregate listing scope, filter/search/paginate và trả metadata cho metric/tab/calendar.
 * `signal` dùng để hủy request cũ khi user đổi query nhanh, tránh stale response và lãng phí network.
 */
export async function getHostReservations(
  token: string | null,
  query: HostReservationsQuery,
  signal?: AbortSignal,
): Promise<ApiResponse<HostReservationsPageResponse>> {
  const params = new URLSearchParams();

  if (query.listingId) params.set("listingId", query.listingId);
  query.statuses?.forEach((status) => {
    params.append("statuses", status);
  });
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  params.set("page", String(query.page));
  params.set("size", String(query.size));

  const res = await apiClient.get(
    `${prefix}/bookings/host/reservations?${params.toString()}`,
    {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return res.data;
}

export async function getHostReservationDetail(
  token: string | null,
  reservationId: string,
): Promise<ApiResponse<HostReservationDetailResponse>> {
  const res = await apiClient.get(
    `${prefix}/bookings/host/reservations/${reservationId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function updateHostReservationStatus(
  token: string | null,
  reservationId: string,
  data: UpdateReservationStatusRequest,
): Promise<ApiResponse<HostReservationDetailResponse>> {
  const res = await apiClient.patch(
    `${prefix}/bookings/host/reservations/${reservationId}/status`,
    data,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}
