import type { AxiosResponse } from "axios";
import type { ApiResponse } from "@/types/api.type";
import type {
  AdminComplaintDecision,
  BookingStatus,
  ComplaintResponse,
  ComplaintStatus,
  PaymentLifecycleStatus,
} from "@/types/booking.type";
import apiClient from "../client";
import type { ListingResponse } from "./listing";

const prefix = process.env.NEXT_PUBLIC_PREFIX as string;

export type RefundStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type RefundBusinessCause =
  | "GUEST_CANCELLATION"
  | "HOST_CANCELLATION"
  | "ADMIN_FORCE_CANCELLATION"
  | "COMPLAINT_DECISION";
export type HostPenaltyStatus = "ACTIVE" | "WAIVED";
export type AuditEventSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AdminReservationSummary {
  bookingId: string;
  reservationCode?: string | null;
  listingId: string;
  listingTitle?: string | null;
  guestId: string;
  guestName?: string | null;
  hostId: string;
  hostName?: string | null;
  checkInDate: string;
  checkOutDate: string;
  status: BookingStatus;
  paymentStatus?: PaymentLifecycleStatus | null;
  totalAmount: number;
  currency: string;
  createdAt: string;
  riskFlags?: string[];
}

export interface AdminReservationsQuery {
  statuses?: BookingStatus[];
  search?: string;
  page?: number;
  size?: number;
}

export interface AdminRefundRecord {
  refundId: string;
  bookingId: string;
  paymentId?: string | null;
  guestId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  businessCause: RefundBusinessCause;
  paymentStatus?: PaymentLifecycleStatus | null;
  providerRefundId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface HostPenaltyRecord {
  penaltyId: string;
  bookingId: string;
  listingId: string;
  hostId: string;
  reasonCode?: string | null;
  points: number;
  status: HostPenaltyStatus;
  createdAt: string;
  waivedAt?: string | null;
  waiverReason?: string | null;
}

export interface AuditEventRecord {
  eventId: string;
  eventType: string;
  actorId?: string | null;
  actorRole?: "ADMIN" | "HOST" | "GUEST" | "SYSTEM" | string | null;
  entityType?: string | null;
  entityId?: string | null;
  severity: AuditEventSeverity;
  message: string;
  occurredAt: string;
}

export interface AdminListingStatusRequest {
  reason: string;
  suspendedUntil?: string;
}

const authConfig = (token: string | null) => ({
  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
});

const unwrap = <T>(response: AxiosResponse<ApiResponse<T>>) => response.data;

export async function listAdminReservations(
  token: string | null,
  query: AdminReservationsQuery = {},
): Promise<ApiResponse<AdminReservationSummary[]>> {
  const params = new URLSearchParams();
  query.statuses?.forEach((status) => {
    params.append("statuses", status);
  });
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));

  // TODO backend: implement GET /bookings/admin/reservations for admin-wide reservation search.
  return unwrap(
    await apiClient.get(
      `${prefix}/bookings/admin/reservations${params.toString() ? `?${params.toString()}` : ""}`,
      authConfig(token),
    ),
  );
}

export async function forceCancelAdminBooking(
  token: string | null,
  bookingId: string,
  data: {
    reason: string;
    adminNote: string;
    refundAmount?: number;
  },
): Promise<ApiResponse<unknown>> {
  return unwrap(
    await apiClient.post(
      `${prefix}/bookings/admin/bookings/${bookingId}/force-cancel`,
      data,
      authConfig(token),
    ),
  );
}

export async function listAdminRefunds(
  token: string | null,
): Promise<ApiResponse<AdminRefundRecord[]>> {
  // TODO backend: implement GET /payments/admin/refunds as read-only refund operations queue.
  return unwrap(
    await apiClient.get(`${prefix}/payments/admin/refunds`, authConfig(token)),
  );
}

export async function listAdminComplaints(
  token: string | null,
  status?: ComplaintStatus,
): Promise<ApiResponse<ComplaintResponse[]>> {
  return unwrap(
    await apiClient.get(`${prefix}/bookings/admin/complaints`, {
      ...authConfig(token),
      params: status ? { status } : undefined,
    }),
  );
}

export async function decideAdminComplaint(
  token: string | null,
  complaintId: string,
  data: {
    decision: AdminComplaintDecision;
    adminNote: string;
    refundAmount?: number;
  },
): Promise<ApiResponse<ComplaintResponse>> {
  return unwrap(
    await apiClient.post(
      `${prefix}/bookings/admin/complaints/${complaintId}/decision`,
      data,
      authConfig(token),
    ),
  );
}

export async function listAdminHostPenalties(
  token: string | null,
): Promise<ApiResponse<HostPenaltyRecord[]>> {
  // TODO backend: implement GET /bookings/admin/host-penalties for penalty queue and threshold review.
  return unwrap(
    await apiClient.get(
      `${prefix}/bookings/admin/host-penalties`,
      authConfig(token),
    ),
  );
}

export async function waiveAdminHostPenalty(
  token: string | null,
  penaltyId: string,
  reason: string,
): Promise<ApiResponse<unknown>> {
  return unwrap(
    await apiClient.post(
      `${prefix}/bookings/admin/host-penalties/${penaltyId}/waive`,
      { reason },
      authConfig(token),
    ),
  );
}

export async function listAdminListings(
  token: string | null,
): Promise<ApiResponse<ListingResponse[]>> {
  // TODO backend: replace with GET /listings/admin when listing-service exposes admin-only listing search.
  return unwrap(await apiClient.get(`${prefix}/listings`, authConfig(token)));
}

export async function suspendAdminListing(
  token: string | null,
  listingId: string,
  data: AdminListingStatusRequest,
): Promise<ApiResponse<void>> {
  return unwrap(
    await apiClient.post(
      `${prefix}/bookings/admin/listings/${listingId}/suspend`,
      data,
      authConfig(token),
    ),
  );
}

export async function unsuspendAdminListing(
  token: string | null,
  listingId: string,
  reason: string,
): Promise<ApiResponse<void>> {
  return unwrap(
    await apiClient.post(
      `${prefix}/bookings/admin/listings/${listingId}/unsuspend`,
      { reason },
      authConfig(token),
    ),
  );
}

export async function listAdminAuditEvents(
  token: string | null,
): Promise<ApiResponse<AuditEventRecord[]>> {
  // TODO backend: implement GET /activity/admin/events or /bookings/admin/events for admin audit trail.
  return unwrap(
    await apiClient.get(`${prefix}/activity/admin/events`, authConfig(token)),
  );
}
