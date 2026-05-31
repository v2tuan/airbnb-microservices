export type BookingStatus =
  | "PENDING_PAYMENT"
  | "EXPIRED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "COMPLETED"
  | "CANCELLED_BY_GUEST"
  | "CANCELLED_BY_HOST"
  | "CANCELLED_BY_ADMIN";

export type PaymentLifecycleStatus =
  | "PAYMENT_PENDING"
  | "PAID"
  | "PAYMENT_FAILED"
  | "PAYMENT_CANCELLED"
  | "REFUND_PENDING"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "REFUND_FAILED";

export type BookingFilterType = "UPCOMING" | "COMPLETED" | "CANCELLED" | "ALL";

export interface BookingTripsResponse {
  basePrice: number;
  bookingId: string;
  checkInDate: string;
  checkOutDate: string;
  city: string;
  country: string;
  coverImageUrl: string;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  checkedOutAt?: string | null;
  currency: string;
  hostId: string | null;
  listingId: string;
  numAdults: number;
  numChildren: number;
  numInfants: number;
  numPets: number;
  status: BookingStatus;
  statusDisplayName: string;
  title: string;
  totalAmount: number;
  totalNights: number;
  tripLabel: string;
}

export interface CheckoutRequest {
  roomId: string;
  roomName?: string;
  userId?: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount?: number;
  currency: string;
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
  clientSecret: string;
  publishableKey: string;
  totalAmount: number;
  currency: string;
  paymentStatus: PaymentLifecycleStatus;
  expiresAt: string;
  message: string;
}

export interface BookingDetailResponse {
  bookingId: string;
  reservationCode: string;
  listingId: string;
  guestId: string;
  hostId: string | null;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  status: BookingStatus;
  statusDisplayName: string;
  currency: string;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  completedAt: string | null;
  paymentIntentId: string | null;
  numAdults: number;
  numChildren: number;
  numInfants: number;
  numPets: number;
  guestNotes?: string | null;
  listing: BookingDetailListing | null;
  host: BookingDetailHost | null;
  accessInfo: BookingAccessInfo | null;
  payment: BookingPaymentSummary | null;
  cancellationPolicy: BookingCancellationPolicy | null;
  reviewSummary: BookingReviewSummary | null;
}

export interface BookingDetailListing {
  listingId: string;
  title: string;
  description?: string | null;
  propertyType?: string | null;
  roomType?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  maxGuests?: number | null;
  numBedrooms?: number | null;
  numBeds?: number | null;
  numBathrooms?: number | string | null;
  checkInStartTime?: string | null;
  checkInEndTime?: string | null;
  checkOutTime?: string | null;
  photos?: Array<{
    photoId?: string;
    photoUrl?: string;
    caption?: string;
    displayOrder?: number;
    isCover?: boolean;
  }>;
  amenities?: Array<{
    amenityId?: string;
    name?: string;
    category?: string;
    iconUrl?: string;
  }>;
  houseRules?: {
    checkInFrom?: string | null;
    checkInTo?: string | null;
    checkOutTime?: string | null;
    smokingAllowed?: boolean | null;
    petsAllowed?: boolean | null;
    partiesAllowed?: boolean | null;
    childrenAllowed?: boolean | null;
    additionalRules?: string | null;
  } | null;
}

export interface BookingDetailHost {
  keycloakUserId?: string | null;
  userId?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  superHost?: boolean;
  joinedAt?: string | null;
}

export interface BookingAccessInfo {
  wifiPassword?: string | null;
  entryCode?: string | null;
  smartLockInstructions?: string | null;
  keyPickupInstructions?: string | null;
  checkInGuide?: Array<{
    stepNumber: number;
    title: string;
    description: string;
    imageUrl?: string | null;
  }>;
}

export interface BookingPaymentSummary {
  totalAmount: number;
  accommodationAmount: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  currency: string;
  refundPolicy?: string | null;
  stripePaymentIntentId?: string | null;
  stripePaymentStatus?: PaymentLifecycleStatus | null;
}

export interface BookingCancellationPolicy {
  type: string;
  description: string;
  refundable: boolean;
}

export interface BookingReviewSummary {
  averageRating: number | string;
  reviewCount: number;
}

export interface ReservationGuestSummary {
  userId?: string | null;
  keycloakUserId?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface HostReservationResponse {
  reservationId: string;
  reservationCode: string;
  listingId: string;
  hostId: string | null;
  guestId: string;
  guest?: ReservationGuestSummary | null;
  listingTitle?: string | null;
  listingCity?: string | null;
  listingCountry?: string | null;
  listingCoverImageUrl?: string | null;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  totalAmount: number;
  currency: string;
  status: BookingStatus;
  statusDisplayName: string;
  createdAt: string;
  expiresAt?: string | null;
  paidAt?: string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  numAdults: number;
  numChildren: number;
  numInfants: number;
  numPets: number;
  guestNotes?: string | null;
}

export interface HostReservationStats {
  total: number;
  pending: number;
  arrivalsToday: number;
  inHouse: number;
  revenue: number;
  currency: string;
}

export interface HostReservationsPageResponse {
  content: HostReservationResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  stats: HostReservationStats;
  statusCounts: Record<string, number>;
  occupiedDates: string[];
  nextReservations: HostReservationResponse[];
}

export interface HostReservationsQuery {
  listingId?: string;
  statuses?: BookingStatus[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  size: number;
}

export interface HostReservationDetailResponse {
  reservationId: string;
  reservationCode: string;
  listingId: string;
  hostId: string | null;
  guestId: string;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  status: BookingStatus;
  statusDisplayName: string;
  currency: string;
  totalAmount: number;
  paymentIntentId?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  paidAt?: string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  numAdults: number;
  numChildren: number;
  numInfants: number;
  numPets: number;
  guestNotes?: string | null;
  listing: BookingDetailListing | null;
  guest?: ReservationGuestSummary | null;
  payment?: Omit<BookingPaymentSummary, "refundPolicy"> | null;
}

export interface UpdateReservationStatusRequest {
  status: BookingStatus;
  reason?: string;
}
