export type ReservationStatus =
    | "PENDING_PAYMENT"
    | "EXPIRED"
    | "CONFIRMED"
    | "CHECKED_IN"
    | "CHECKED_OUT"
    | "COMPLETED"
    | "CANCELLED_BY_GUEST"
    | "CANCELLED_BY_HOST"
    | "CANCELLED_BY_ADMIN";
export type PaymentStatus = "paid" | "pending" | "refunded";

export interface Host {
    id: string;
    name: string;
    avatar: string;
    superhost: boolean;
    responseRate: number;
    responseTime: string;
    joinedYear: number;
    reviews: number;
}

export interface Amenity {
    icon: string;
    label: string;
}

export interface PaymentBreakdown {
    nightlyRate: number;
    nights: number;
    cleaningFee: number;
    serviceFee: number;
    taxes: number;
    total: number;
    currency: string;
}

export interface Trip {
    id: string;
    status: ReservationStatus;
    confirmationCode: string;
    createdAt?: string;
    expiresAt?: string;
    property: {
        id: string;
        title: string;
        type: string;
        location: string;
        city: string;
        country: string;
        image: string;
        images: string[];
        rating: number;
        reviewCount: number;
        amenities: string[];
        address: string;
        coordinates: { lat: number; lng: number };
    };
    checkIn: string;
    checkOut: string;
    guests: { adults: number; children: number; infants: number };
    host: Host;
    payment: PaymentBreakdown;
    paymentStatus: PaymentStatus;
    paymentMethod: { type: string; last4: string; brand: string };
    cancellationPolicy: {
        type: string;
        description: string;
        refundable: boolean;
        deadline: string;
    };
    notes?: string;
    reviewSubmitted?: boolean;
    checkInInstructions?: string;
    wifiDetails?: { network: string; password: string };
}

export interface WishlistItem {
    id: string;
    title: string;
    location: string;
    image: string;
    rating: number;
    reviewCount: number;
    pricePerNight: number;
    currency: string;
    type: string;
    superhost: boolean;
    savedDate: string;
}

const pendingPaymentCreatedAt = new Date(Date.now() - 3 * 60 * 1000);
const pendingPaymentExpiresAt = new Date(pendingPaymentCreatedAt.getTime() + 15 * 60 * 1000);

export const mockTrips: Trip[] = [
    {
        id: "trip-001",
        status: "CONFIRMED",
        confirmationCode: "HMABZXQ29",
        property: {
            id: "prop-001",
            title: "Cliffside Villa with Infinity Pool",
            type: "Entire villa",
            location: "Santorini, Greece",
            city: "Oia",
            country: "Greece",
            image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
            images: [
                "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80",
                "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80",
                "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80",
                "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80",
                "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80",
            ],
            rating: 4.97,
            reviewCount: 312,
            amenities: ["Pool", "WiFi", "Kitchen", "Air conditioning", "Washer", "Free parking", "Hot tub", "BBQ grill", "Ocean view", "Breakfast"],
            address: "12 Caldera View, Oia 847 02, Greece",
            coordinates: { lat: 36.4618, lng: 25.3753 },
        },
        checkIn: "2026-06-14",
        checkOut: "2026-06-21",
        guests: { adults: 2, children: 0, infants: 0 },
        host: {
            id: "host-001",
            name: "Elena Papadopoulos",
            avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
            superhost: true,
            responseRate: 99,
            responseTime: "within an hour",
            joinedYear: 2016,
            reviews: 847,
        },
        payment: {
            nightlyRate: 480,
            nights: 7,
            cleaningFee: 120,
            serviceFee: 398,
            taxes: 193,
            total: 4071,
            currency: "USD",
        },
        paymentStatus: "paid",
        paymentMethod: { type: "card", last4: "4242", brand: "Visa" },
        cancellationPolicy: {
            type: "Moderate",
            description: "Free cancellation before May 30. Cancel before Jun 7 for a partial refund.",
            refundable: true,
            deadline: "2026-05-30",
        },
        checkInInstructions: "Check-in is from 3:00 PM. The lockbox code is #4891. Parking is available in the private driveway.",
        wifiDetails: { network: "Villa_Caldera_5G", password: "Santorini2026!" },
    },
    {
        id: "trip-002",
        status: "CONFIRMED",
        confirmationCode: "TKPRY7N44",
        property: {
            id: "prop-002",
            title: "Modern Loft in Shibuya District",
            type: "Entire loft",
            location: "Tokyo, Japan",
            city: "Shibuya",
            country: "Japan",
            image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
            images: [
                "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80",
                "https://images.unsplash.com/photo-1536437075651-01d675529a6b?w=1200&q=80",
                "https://images.unsplash.com/photo-1493397212122-2b85dda8106b?w=1200&q=80",
                "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1200&q=80",
            ],
            rating: 4.89,
            reviewCount: 178,
            amenities: ["WiFi", "Kitchen", "Air conditioning", "Washer", "City view", "Gym", "Concierge"],
            address: "3-14-8 Shibuya, Tokyo 150-0002, Japan",
            coordinates: { lat: 35.6762, lng: 139.6503 },
        },
        checkIn: "2026-08-02",
        checkOut: "2026-08-09",
        guests: { adults: 2, children: 1, infants: 0 },
        host: {
            id: "host-002",
            name: "Yuki Tanaka",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
            superhost: false,
            responseRate: 95,
            responseTime: "within a few hours",
            joinedYear: 2019,
            reviews: 203,
        },
        payment: {
            nightlyRate: 195,
            nights: 7,
            cleaningFee: 65,
            serviceFee: 162,
            taxes: 98,
            total: 1690,
            currency: "USD",
        },
        paymentStatus: "paid",
        paymentMethod: { type: "card", last4: "8831", brand: "Mastercard" },
        cancellationPolicy: {
            type: "Flexible",
            description: "Free cancellation before Jul 29. After that, the first night is non-refundable.",
            refundable: true,
            deadline: "2026-07-29",
        },
        checkInInstructions: "Self check-in with smart lock. Code will be sent 24 hours before arrival.",
        wifiDetails: { network: "Shibuya_Loft_WiFi", password: "Tokyo2026#" },
    },
    {
        id: "trip-006",
        status: "PENDING_PAYMENT",
        confirmationCode: "PND7V2Q91",
        createdAt: pendingPaymentCreatedAt.toISOString(),
        expiresAt: pendingPaymentExpiresAt.toISOString(),
        property: {
            id: "prop-006",
            title: "Seaside Loft with Harbor Views",
            type: "Entire loft",
            location: "Lisbon, Portugal",
            city: "Lisbon",
            country: "Portugal",
            image: "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=800&q=80",
            images: [
                "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=1200&q=80",
                "https://images.unsplash.com/photo-1501183638710-841dd1904471?w=1200&q=80",
                "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&q=80",
                "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80",
            ],
            rating: 4.92,
            reviewCount: 142,
            amenities: ["WiFi", "Kitchen", "Air conditioning", "Washer", "Ocean view", "Balcony", "Coffee maker"],
            address: "18 Rua do Sol, Lisbon 1100-603, Portugal",
            coordinates: { lat: 38.7223, lng: -9.1393 },
        },
        checkIn: "2026-06-04",
        checkOut: "2026-06-07",
        guests: { adults: 2, children: 0, infants: 0 },
        host: {
            id: "host-006",
            name: "Marta Silva",
            avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80",
            superhost: true,
            responseRate: 98,
            responseTime: "within an hour",
            joinedYear: 2018,
            reviews: 318,
        },
        payment: {
            nightlyRate: 210,
            nights: 3,
            cleaningFee: 55,
            serviceFee: 96,
            taxes: 42,
            total: 823,
            currency: "USD",
        },
        paymentStatus: "pending",
        paymentMethod: { type: "card", last4: "1122", brand: "Visa" },
        cancellationPolicy: {
            type: "Flexible",
            description: "Free cancellation within 48 hours. After that, the first night is non-refundable.",
            refundable: true,
            deadline: "2026-05-29",
        },
        notes: "Payment authorization pending. Reservation held for 15 minutes.",
    },
    {
        id: "trip-003",
        status: "COMPLETED",
        confirmationCode: "NZWXB3M81",
        property: {
            id: "prop-003",
            title: "Beachfront Bungalow with Thatched Roof",
            type: "Entire bungalow",
            location: "Bali, Indonesia",
            city: "Seminyak",
            country: "Indonesia",
            image: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=800&q=80",
            images: [
                "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=1200&q=80",
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
                "https://images.unsplash.com/photo-1573790387438-4da905039392?w=1200&q=80",
                "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1200&q=80",
            ],
            rating: 4.95,
            reviewCount: 428,
            amenities: ["Pool", "WiFi", "Kitchen", "Air conditioning", "Beach access", "Surfboard", "Bike"],
            address: "Jl. Petitenget No.8, Seminyak, Bali 80361, Indonesia",
            coordinates: { lat: -8.6905, lng: 115.1553 },
        },
        checkIn: "2026-02-10",
        checkOut: "2026-02-17",
        guests: { adults: 4, children: 0, infants: 0 },
        host: {
            id: "host-003",
            name: "Wayan Suardika",
            avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80",
            superhost: true,
            responseRate: 100,
            responseTime: "within an hour",
            joinedYear: 2015,
            reviews: 1203,
        },
        payment: {
            nightlyRate: 220,
            nights: 7,
            cleaningFee: 80,
            serviceFee: 184,
            taxes: 92,
            total: 1896,
            currency: "USD",
        },
        paymentStatus: "paid",
        paymentMethod: { type: "card", last4: "2291", brand: "Amex" },
        cancellationPolicy: {
            type: "Strict",
            description: "Non-refundable. No refunds are available for this reservation.",
            refundable: false,
            deadline: "2026-01-11",
        },
        reviewSubmitted: false,
    },
    {
        id: "trip-004",
        status: "COMPLETED",
        confirmationCode: "FQHTR6P55",
        property: {
            id: "prop-004",
            title: "Historic Townhouse in Le Marais",
            type: "Entire townhouse",
            location: "Paris, France",
            city: "Le Marais",
            country: "France",
            image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
            images: [
                "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
                "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=1200&q=80",
                "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80",
            ],
            rating: 4.91,
            reviewCount: 267,
            amenities: ["WiFi", "Kitchen", "Washer", "Air conditioning", "Balcony", "City view", "Coffee maker"],
            address: "18 Rue de Bretagne, Paris 75003, France",
            coordinates: { lat: 48.8566, lng: 2.3522 },
        },
        checkIn: "2025-12-20",
        checkOut: "2025-12-27",
        guests: { adults: 2, children: 0, infants: 0 },
        host: {
            id: "host-004",
            name: "Sophie Dubois",
            avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
            superhost: true,
            responseRate: 98,
            responseTime: "within an hour",
            joinedYear: 2017,
            reviews: 524,
        },
        payment: {
            nightlyRate: 310,
            nights: 7,
            cleaningFee: 95,
            serviceFee: 258,
            taxes: 140,
            total: 2663,
            currency: "USD",
        },
        paymentStatus: "paid",
        paymentMethod: { type: "card", last4: "5571", brand: "Visa" },
        cancellationPolicy: {
            type: "Moderate",
            description: "Free cancellation before Dec 13.",
            refundable: false,
            deadline: "2025-12-13",
        },
        reviewSubmitted: true,
    },
    {
        id: "trip-005",
        status: "CANCELLED_BY_GUEST",
        confirmationCode: "BVKWZ9L33",
        property: {
            id: "prop-005",
            title: "Mountain Chalet with Hot Tub & Ski Access",
            type: "Entire chalet",
            location: "Verbier, Switzerland",
            city: "Verbier",
            country: "Switzerland",
            image: "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&q=80",
            images: [
                "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&q=80",
                "https://images.unsplash.com/photo-1452784444945-3f422708fe5e?w=1200&q=80",
                "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
            ],
            rating: 4.93,
            reviewCount: 189,
            amenities: ["Hot tub", "WiFi", "Kitchen", "Ski-in/ski-out", "Fireplace", "Mountain view", "Sauna"],
            address: "Route de Verbier, 1936 Verbier, Switzerland",
            coordinates: { lat: 46.0961, lng: 7.2283 },
        },
        checkIn: "2026-01-15",
        checkOut: "2026-01-22",
        guests: { adults: 4, children: 2, infants: 0 },
        host: {
            id: "host-005",
            name: "Hans Zimmermann",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
            superhost: false,
            responseRate: 92,
            responseTime: "within a day",
            joinedYear: 2018,
            reviews: 97,
        },
        payment: {
            nightlyRate: 650,
            nights: 7,
            cleaningFee: 200,
            serviceFee: 540,
            taxes: 260,
            total: 5550,
            currency: "USD",
        },
        paymentStatus: "refunded",
        paymentMethod: { type: "card", last4: "3389", brand: "Mastercard" },
        cancellationPolicy: {
            type: "Moderate",
            description: "Fully refunded due to cancellation before deadline.",
            refundable: true,
            deadline: "2026-01-01",
        },
        notes: "Cancelled due to flight issues. Full refund processed.",
    },
];

export const mockWishlist: WishlistItem[] = [
    {
        id: "wish-001",
        title: "Overwater Bungalow in the Maldives",
        location: "Malé Atoll, Maldives",
        image: "https://images.unsplash.com/photo-1439130490301-25e322d88054?w=800&q=80",
        rating: 4.98,
        reviewCount: 543,
        pricePerNight: 890,
        currency: "USD",
        type: "Entire bungalow",
        superhost: true,
        savedDate: "2026-04-10",
    },
    {
        id: "wish-002",
        title: "Treehouse Retreat in Costa Rica",
        location: "Monteverde, Costa Rica",
        image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80",
        rating: 4.94,
        reviewCount: 214,
        pricePerNight: 340,
        currency: "USD",
        type: "Treehouse",
        superhost: true,
        savedDate: "2026-04-15",
    },
    {
        id: "wish-003",
        title: "Desert Dome Under the Stars",
        location: "Wadi Rum, Jordan",
        image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&q=80",
        rating: 4.92,
        reviewCount: 387,
        pricePerNight: 220,
        currency: "USD",
        type: "Dome",
        superhost: false,
        savedDate: "2026-03-28",
    },
    {
        id: "wish-004",
        title: "Converted Lighthouse on Rocky Coast",
        location: "Cornwall, United Kingdom",
        image: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&q=80",
        rating: 4.88,
        reviewCount: 129,
        pricePerNight: 415,
        currency: "USD",
        type: "Lighthouse",
        superhost: false,
        savedDate: "2026-05-01",
    },
    {
        id: "wish-005",
        title: "Lakeside Cabin with Private Dock",
        location: "Lake Tahoe, California",
        image: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80",
        rating: 4.96,
        reviewCount: 301,
        pricePerNight: 560,
        currency: "USD",
        type: "Cabin",
        superhost: true,
        savedDate: "2026-04-20",
    },
    {
        id: "wish-006",
        title: "Riad with Rooftop Pool in Medina",
        location: "Marrakech, Morocco",
        image: "https://images.unsplash.com/photo-1539667103873-9c0e45e69af1?w=800&q=80",
        rating: 4.91,
        reviewCount: 478,
        pricePerNight: 295,
        currency: "USD",
        type: "Entire riad",
        superhost: true,
        savedDate: "2026-05-08",
    },
];
