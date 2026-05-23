// TripsCard.tsx

"use client";

import Link from "next/link";
import Image from "next/image";

import {
    MapPin,
    Calendar,
    Users,
    ArrowRight,
} from "lucide-react";

import {
    cn,
    formatDateRange,
    getNights,
    formatCurrency,
    getDaysUntilCheckIn,
} from "@/lib/utils";

import { ReservationStatusBadge } from "./ReservationStatusBadge";
import { PaymentCountdownTimer } from "./PaymentCountdownTimer";
import { usePaymentCountdown } from "./usePaymentCountdown";
import {BookingStatus, BookingTripsResponse} from "@/types/booking.type";
import {useRouter} from "next/navigation";

interface TripsCardProps {
    trip: BookingTripsResponse;
}

export function TripsCard({ trip }: TripsCardProps) {
    const router = useRouter();

    const nights = getNights(
        trip.checkInDate,
        trip.checkOutDate
    );

    const totalGuests =
        trip.numAdults + trip.numChildren;

    const daysUntil = getDaysUntilCheckIn(
        trip.checkInDate
    );

    const isPendingPayment =
        trip.status === "PENDING_PAYMENT";

    const countdown = usePaymentCountdown(
        isPendingPayment
            ? trip.expiresAt
            : undefined
    );

    const isPaymentExpired =
        isPendingPayment &&
        countdown.isExpired;

    const effectiveStatus: BookingStatus =
        isPaymentExpired
            ? "EXPIRED"
            : trip.status;

    const isCancelled =
        effectiveStatus === "CANCELLED" ||
        effectiveStatus === "EXPIRED";

    const showCountdown =
        isPendingPayment &&
        !isPaymentExpired &&
        !!trip.expiresAt;

    const showPayNow =
        isPendingPayment &&
        !isPaymentExpired;

    const showUpcomingBadge =
        effectiveStatus === "PAID" &&
        daysUntil > 0 &&
        daysUntil <= 30;

    const cardTone =
        isCancelled
            ? "border-slate-200 bg-slate-50/80"
            : isPendingPayment
                ? "border-amber-200 bg-amber-50/60"
                : "border-slate-100 bg-white";

    const handlePayNow = () => {
        const params = new URLSearchParams({
            checkin: trip.checkInDate,
            checkout: trip.checkOutDate,

            numberOfAdults: String(
                trip.numAdults
            ),

            numberOfChildren: String(
                trip.numChildren
            ),

            numberOfInfants: String(
                trip.numInfants
            ),

            numberOfPets: String(
                trip.numPets
            ),

            guestCurrency: trip.currency,

            bookingId: trip.bookingId,
        });

        router.push(
            `/checkout/${trip.listingId}?${params.toString()}`
        );
    };

    return (
        <div
            className={cn(
                "group rounded-2xl overflow-hidden border transition-all duration-300",
                "hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1",
                cardTone,
                isCancelled
                    ? "opacity-80"
                    : "shadow-sm"
            )}
        >
            <Link
                href={`/trips/${trip.bookingId}`}
                className="block"
            >
                {/* Image */}
                <div className="relative w-full h-52 overflow-hidden">
                    <Image
                        src={trip.coverImageUrl}
                        alt={trip.title}
                        fill
                        className={cn(
                            "object-cover transition-transform duration-500 group-hover:scale-105",
                            isCancelled
                                ? "grayscale"
                                : ""
                        )}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <ReservationStatusBadge
                            status={effectiveStatus}
                        />
                    </div>

                    {showCountdown && (
                        <div className="absolute top-3 right-3">
                            <PaymentCountdownTimer
                                minutes={
                                    countdown.minutes
                                }
                                seconds={
                                    countdown.seconds
                                }
                                isCritical={
                                    countdown.isCritical
                                }
                                size="sm"
                            />
                        </div>
                    )}

                    {showUpcomingBadge && (
                        <div className="absolute bottom-3 left-3">
                            <span className="bg-white/95 backdrop-blur-sm text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                                {daysUntil === 1
                                    ? "Tomorrow!"
                                    : `In ${daysUntil} days`}
                            </span>
                        </div>
                    )}
                </div>
            </Link>

            {/* Content */}
            <div className="p-5">
                <Link
                    href={`/trips/${trip.bookingId}`}
                    className="block"
                >
                    <h3 className="font-semibold text-slate-900 text-base leading-snug mb-1 group-hover:text-rose-600 transition-colors line-clamp-1 font-display">
                        {trip.title}
                    </h3>
                </Link>

                <div className="flex items-center gap-1 text-slate-500 text-sm mb-3">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />

                    <span className="line-clamp-1">
                        {trip.city}, {trip.country}
                    </span>
                </div>

                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />

                        <span>
                            {formatDateRange(
                                trip.checkInDate,
                                trip.checkOutDate
                            )}
                        </span>

                        <span className="text-slate-300">
                            ·
                        </span>

                        <span className="text-slate-400">
                            {nights}{" "}
                            {nights === 1
                                ? "night"
                                : "nights"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />

                        <span>
                            {totalGuests}{" "}
                            {totalGuests === 1
                                ? "guest"
                                : "guests"}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div>
                        <span className="font-bold text-slate-900 text-base">
                            {formatCurrency(
                                trip.totalAmount,
                                trip.currency
                            )}
                        </span>

                        <span className="text-slate-400 text-sm ml-1">
                            total
                        </span>
                    </div>

                    <Link
                        href={`/trips/${trip.bookingId}`}
                        className="inline-flex items-center gap-1 text-rose-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        View details

                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                {showPayNow && (
                    <button
                        onClick={handlePayNow}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white text-amber-700 text-sm font-medium py-2.5 hover:bg-amber-50 transition-colors"
                    >
                        Pay now
                    </button>
                )}
            </div>
        </div>
    );
}