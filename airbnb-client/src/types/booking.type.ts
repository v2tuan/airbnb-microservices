export type BookingStatus =
    | "PENDING_PAYMENT"
    | "PAID"
    | "CANCELLED"
    | "EXPIRED"
    | "REFUNDED";

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

export type BookingFilterType =
    | "UPCOMING"
    | "COMPLETED"
    | "CANCELLED"
    | "ALL";

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