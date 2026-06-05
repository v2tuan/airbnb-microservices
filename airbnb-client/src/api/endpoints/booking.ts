import type { ApiResponse } from "@/types/api.type";
import type {
  BookingDetailResponse,
  BookingFilterType,
  BookingStatus,
  BookingTripsResponse,
  CheckoutRequest,
  CheckoutResponse,
  AdminComplaintDecision,
  ComplaintResponse,
  ComplaintStatus,
  ComplaintType,
  GuestCancellationQuoteResponse,
  HostCancellationQuoteResponse,
  HostCancellationReasonCode,
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
  const res = await apiClient.post<CheckoutResponse>(`${prefix}/payments/checkout`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function getMyBookings(
  token: string | null,
  type: BookingFilterType = "ALL",
): Promise<ApiResponse<BookingTripsResponse[]>> {
  const res = await apiClient.get<ApiResponse<BookingTripsResponse[]>>(`${prefix}/bookings/me`, {
    params: { type },
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
}

export async function getBookingDetail(
  token: string | null,
  bookingId: string,
): Promise<ApiResponse<BookingDetailResponse>> {
  const res = await apiClient.get<ApiResponse<BookingDetailResponse>>(`${prefix}/bookings/${bookingId}/detail`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
}

export async function cancelBooking(
  token: string | null,
  bookingId: string,
  reason: string,
): Promise<ApiResponse<{ status: BookingStatus }>> {
  const res = await apiClient.post<ApiResponse<{ status: BookingStatus }>>(
    `${prefix}/bookings/${bookingId}/cancel`,
    { reason },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function requestCancellationQuote(
  token: string | null,
  bookingId: string,
): Promise<ApiResponse<GuestCancellationQuoteResponse>> {
  const res = await apiClient.post<ApiResponse<GuestCancellationQuoteResponse>>(
    `${prefix}/bookings/${bookingId}/cancellation-quotes`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function confirmCancellationQuote(
  token: string | null,
  bookingId: string,
  quoteId: string,
  reason: string,
): Promise<ApiResponse<{ status: BookingStatus }>> {
  const res = await apiClient.post<ApiResponse<{ status: BookingStatus }>>(
    `${prefix}/bookings/${bookingId}/cancel/confirm`,
    { quoteId, reason },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function createComplaint(
  token: string | null,
  bookingId: string,
  data: {
    type: ComplaintType;
    description: string;
    evidenceUrls?: string[];
  },
): Promise<ApiResponse<ComplaintResponse>> {
  const res = await apiClient.post<ApiResponse<ComplaintResponse>>(
    `${prefix}/bookings/${bookingId}/complaints`,
    data,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function getMyComplaints(
  token: string | null,
): Promise<ApiResponse<ComplaintResponse[]>> {
  const res = await apiClient.get<ApiResponse<ComplaintResponse[]>>(`${prefix}/bookings/me/complaints`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
}

export async function acceptComplaintHostResponse(
  token: string | null,
  complaintId: string,
): Promise<ApiResponse<ComplaintResponse>> {
  const res = await apiClient.post<ApiResponse<ComplaintResponse>>(
    `${prefix}/bookings/complaints/${complaintId}/accept`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function escalateComplaint(
  token: string | null,
  complaintId: string,
): Promise<ApiResponse<ComplaintResponse>> {
  const res = await apiClient.post<ApiResponse<ComplaintResponse>>(
    `${prefix}/bookings/complaints/${complaintId}/escalate`,
    {},
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
  const res = await apiClient.get<ApiResponse<HostReservationResponse[]>>(
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

  const res = await apiClient.get<ApiResponse<HostReservationsPageResponse>>(
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
  const res = await apiClient.get<ApiResponse<HostReservationDetailResponse>>(
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
  const res = await apiClient.patch<ApiResponse<HostReservationDetailResponse>>(
    `${prefix}/bookings/host/reservations/${reservationId}/status`,
    data,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function requestHostCancellationQuote(
  token: string | null,
  reservationId: string,
  reasonCode: HostCancellationReasonCode,
): Promise<ApiResponse<HostCancellationQuoteResponse>> {
  const res = await apiClient.post<ApiResponse<HostCancellationQuoteResponse>>(
    `${prefix}/bookings/host/reservations/${reservationId}/cancellation-quotes`,
    { reasonCode },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function confirmHostCancellationQuote(
  token: string | null,
  reservationId: string,
  quoteId: string,
  reason: string,
): Promise<ApiResponse<HostReservationDetailResponse>> {
  const res = await apiClient.post<ApiResponse<HostReservationDetailResponse>>(
    `${prefix}/bookings/host/reservations/${reservationId}/cancel/confirm`,
    { quoteId, reason },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function getHostComplaints(
  token: string | null,
): Promise<ApiResponse<ComplaintResponse[]>> {
  const res = await apiClient.get<ApiResponse<ComplaintResponse[]>>(`${prefix}/bookings/host/complaints`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
}

export async function respondToComplaint(
  token: string | null,
  complaintId: string,
  response: string,
): Promise<ApiResponse<ComplaintResponse>> {
  const res = await apiClient.post<ApiResponse<ComplaintResponse>>(
    `${prefix}/bookings/host/complaints/${complaintId}/respond`,
    { response },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function getAdminComplaints(
  token: string | null,
  status?: ComplaintStatus,
): Promise<ApiResponse<ComplaintResponse[]>> {
  const res = await apiClient.get<ApiResponse<ComplaintResponse[]>>(`${prefix}/bookings/admin/complaints`, {
    params: status ? { status } : undefined,
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data;
}

export async function decideComplaint(
  token: string | null,
  complaintId: string,
  data: {
    decision: AdminComplaintDecision;
    adminNote: string;
    refundAmount?: number;
  },
): Promise<ApiResponse<ComplaintResponse>> {
  const res = await apiClient.post<ApiResponse<ComplaintResponse>>(
    `${prefix}/bookings/admin/complaints/${complaintId}/decision`,
    data,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function forceCancelBooking(
  token: string | null,
  bookingId: string,
  data: {
    reason: string;
    adminNote: string;
    refundAmount?: number;
  },
): Promise<ApiResponse<HostReservationDetailResponse>> {
  const res = await apiClient.post<ApiResponse<HostReservationDetailResponse>>(
    `${prefix}/bookings/admin/bookings/${bookingId}/force-cancel`,
    data,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function waiveHostPenalty(
  token: string | null,
  penaltyId: string,
  reason: string,
): Promise<ApiResponse<unknown>> {
  const res = await apiClient.post<ApiResponse<unknown>>(
    `${prefix}/bookings/admin/host-penalties/${penaltyId}/waive`,
    { reason },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function adminSuspendListing(
  token: string | null,
  listingId: string,
  data: {
    suspendedUntil?: string;
    reason: string;
  },
): Promise<ApiResponse<void>> {
  const res = await apiClient.post<ApiResponse<void>>(
    `${prefix}/bookings/admin/listings/${listingId}/suspend`,
    data,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}

export async function adminUnsuspendListing(
  token: string | null,
  listingId: string,
  reason: string,
): Promise<ApiResponse<void>> {
  const res = await apiClient.post<ApiResponse<void>>(
    `${prefix}/bookings/admin/listings/${listingId}/unsuspend`,
    { reason },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return res.data;
}
