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
  | "CANCELLATION_QUOTE"
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
  checkInFrom?: string;
  checkInTo?: string;
  guest?: string;
  host?: string;
  listing?: string;
  bookingCode?: string;
  page?: number;
  size?: number;
}

export interface AdminBookingPartySummary {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface AdminBookingListingSummary {
  id: string;
  title?: string | null;
  city?: string | null;
  country?: string | null;
  status?: string | null;
}

export interface AdminPaymentSummary {
  paymentId?: string | null;
  paymentIntentId?: string | null;
  status?: PaymentLifecycleStatus | null;
  amount?: number | null;
  currency?: string | null;
  paidAt?: string | null;
}

export interface AdminRefundSummary {
  refundId: string;
  status: RefundStatus;
  amount: number;
  currency: string;
  businessCause: RefundBusinessCause;
  createdAt: string;
}

export interface AdminBookingTimelineItem {
  key: string;
  label: string;
  description?: string | null;
  occurredAt?: string | null;
}

export interface AdminReservationDetail {
  bookingId: string;
  reservationCode?: string | null;
  status: BookingStatus;
  checkInDate: string;
  checkOutDate: string;
  createdAt: string;
  expiresAt?: string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  completedAt?: string | null;
  totalAmount: number;
  currency: string;
  guest: AdminBookingPartySummary;
  host: AdminBookingPartySummary;
  listing: AdminBookingListingSummary;
  payment?: AdminPaymentSummary | null;
  refunds?: AdminRefundSummary[];
  timeline?: AdminBookingTimelineItem[];
  complaintId?: string | null;
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

export interface AdminUserRecord {
  userId: string;
  keycloakUserId: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  host: boolean;
  superhost?: boolean | null;
  enabled?: boolean | null;
  roles?: string[];
  hostVerificationStatus?: string | null;
  stripeAccountStatus?:
    | "NONE"
    | "PENDING"
    | "ACTIVE"
    | "RESTRICTED"
    | string
    | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminUsersQuery {
  page?: number;
  size?: number;
  role?: "ALL" | "HOST" | "ADMIN" | "USER";
}

export interface AdminListingsQuery {
  page?: number;
  size?: number;
  status?: string;
  keyword?: string;
}

export interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

export interface AdminPaymentOverviewSummary {
  paymentCount: number;
  capturedAmount: number;
  refundCount: number;
  refundedAmount: number;
  pendingPayoutCount: number;
  pendingPayoutAmount: number;
  currency: string;
}

export interface AdminPaymentFlowPoint {
  date: string;
  captured: number;
  refunded: number;
  payout: number;
}

export interface AdminStatusCount {
  status: string;
  count: number;
}

export interface AdminPayoutAgingBucket {
  bucket: string;
  amount: number;
}

export interface AdminPaymentQueueItem {
  id: string;
  type: string;
  bookingId?: string | null;
  status: string;
  amount: number;
  currency: string;
  owner: string;
  createdAt?: string | null;
}

export interface AdminTransactionRecord {
  id: string;
  type: "PAYMENT" | "PAYOUT" | "REFUND" | string;
  bookingId?: string | null;
  customerId?: string | null;
  counterpartyId?: string | null;
  status: string;
  amount: number;
  currency: string;
  paymentMethod?: string | null;
  description?: string | null;
  providerId?: string | null;
  createdAt?: string | null;
}

export interface AdminPaymentOverview {
  summary: AdminPaymentOverviewSummary;
  paymentFlow: AdminPaymentFlowPoint[];
  transactionStatus: AdminStatusCount[];
  payoutAging: AdminPayoutAgingBucket[];
  queue: AdminPaymentQueueItem[];
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
  if (query.checkInFrom) params.set("checkInFrom", query.checkInFrom);
  if (query.checkInTo) params.set("checkInTo", query.checkInTo);
  if (query.guest?.trim()) params.set("guest", query.guest.trim());
  if (query.host?.trim()) params.set("host", query.host.trim());
  if (query.listing?.trim()) params.set("listing", query.listing.trim());
  if (query.bookingCode?.trim()) {
    params.set("bookingCode", query.bookingCode.trim());
  }
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));

  return unwrap(
    await apiClient.get(
      `${prefix}/bookings/admin/reservations${params.toString() ? `?${params.toString()}` : ""}`,
      authConfig(token),
    ),
  );
}

export async function getAdminReservationDetail(
  token: string | null,
  bookingId: string,
): Promise<ApiResponse<AdminReservationDetail>> {
  return unwrap(
    await apiClient.get(
      `${prefix}/bookings/admin/reservations/${bookingId}`,
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
  return unwrap(
    await apiClient.get(`${prefix}/payments/admin/refunds`, authConfig(token)),
  );
}

export async function getAdminPaymentOverview(
  token: string | null,
): Promise<ApiResponse<AdminPaymentOverview>> {
  return unwrap(
    await apiClient.get(`${prefix}/payments/admin/overview`, authConfig(token)),
  );
}

export async function listAdminTransactions(
  token: string | null,
): Promise<ApiResponse<AdminTransactionRecord[]>> {
  return unwrap(
    await apiClient.get(
      `${prefix}/payments/admin/transactions`,
      authConfig(token),
    ),
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
  query: AdminListingsQuery = {},
): Promise<ApiResponse<PageResponse<ListingResponse>>> {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  if (query.status) params.set("status", query.status);
  if (query.keyword?.trim()) params.set("keyword", query.keyword.trim());

  return unwrap(
    await apiClient.get(
      `${prefix}/listings/admin${params.toString() ? `?${params.toString()}` : ""}`,
      authConfig(token),
    ),
  );
}

export async function listAdminUsers(
  token: string | null,
  query: AdminUsersQuery = {},
): Promise<ApiResponse<PageResponse<AdminUserRecord>>> {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  if (query.role) params.set("role", query.role);

  return unwrap(
    await apiClient.get(
      `${prefix}/users/admin/users${params.toString() ? `?${params.toString()}` : ""}`,
      authConfig(token),
    ),
  );
}

export async function blockAdminUser(
  token: string | null,
  keycloakUserId: string,
): Promise<ApiResponse<void>> {
  return unwrap(
    await apiClient.put(
      `${prefix}/users/admin/users/${keycloakUserId}/block`,
      undefined,
      authConfig(token),
    ),
  );
}

export async function unblockAdminUser(
  token: string | null,
  keycloakUserId: string,
): Promise<ApiResponse<void>> {
  return unwrap(
    await apiClient.put(
      `${prefix}/users/admin/users/${keycloakUserId}/unblock`,
      undefined,
      authConfig(token),
    ),
  );
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
