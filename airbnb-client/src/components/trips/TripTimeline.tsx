import { CheckCircle2, Clock, Key, MapPin, Smile, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { BookingStatus } from "@/types/booking.type";

interface TripTimelineProps {
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  completedAt?: string | null;
}

export function TripTimeline({
  checkIn,
  checkOut,
  status,
  checkedInAt,
  checkedOutAt,
  completedAt,
}: TripTimelineProps) {
  const now = new Date();
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  const isPending = status === "PENDING_PAYMENT";
  const isConfirmed = status === "CONFIRMED";
  const isCheckedIn = status === "CHECKED_IN";
  const isCheckedOut = status === "CHECKED_OUT";
  const isCompleted = status === "COMPLETED";
  const isCancelled =
    status === "CANCELLED_BY_GUEST" ||
    status === "CANCELLED_BY_HOST" ||
    status === "CANCELLED_BY_ADMIN" ||
    status === "EXPIRED";
  const isActiveReservation =
    isConfirmed || isCheckedIn || isCheckedOut || isCompleted;

  const isBeforeTrip = isActiveReservation && now < checkInDate;
  const hasCheckedIn = Boolean(checkedInAt) || isCheckedIn || isCheckedOut || isCompleted;
  const hasCheckedOut = Boolean(checkedOutAt) || isCheckedOut || isCompleted;
  const hasCompleted = Boolean(completedAt) || isCompleted;
  const isDuringTrip =
    (isActiveReservation && now >= checkInDate && now < checkOutDate) ||
    isCheckedIn;
  const isAfterTrip =
    isCompleted || (isActiveReservation && now >= checkOutDate);

  const steps = [
    {
      icon: isCancelled ? XCircle : isPending ? Clock : CheckCircle2,
      label: isCancelled
        ? "Reservation cancelled"
        : isPending
          ? "Awaiting payment"
          : "Booking confirmed",
      description: isCancelled
        ? "This reservation is no longer active"
        : isPending
          ? "Complete payment to secure this reservation"
          : "Your reservation is secured",
      done: !isPending && !isCancelled,
      active: isPending,
    },
    {
      icon: Clock,
      label: "Pre-arrival",
      description: "Review check-in instructions and prepare for your trip",
      done:
        isActiveReservation && (!isBeforeTrip || isDuringTrip || isAfterTrip),
      active: isBeforeTrip && isConfirmed,
    },
    {
      icon: Key,
      label: `Check-in - ${formatDate(checkIn)}`,
      description: "Arrive at the property",
      done: hasCheckedIn || (isActiveReservation && (isDuringTrip || isAfterTrip)),
      active: isCheckedIn,
    },
    {
      icon: MapPin,
      label: "Enjoying your stay",
      description: "Make memories",
      done: hasCheckedOut || (isActiveReservation && isAfterTrip),
      active: isCheckedIn || (isActiveReservation && isDuringTrip),
    },
    {
      icon: Smile,
      label: `Check-out - ${formatDate(checkOut)}`,
      description: hasCompleted
        ? "Your trip is completed"
        : "Your stay has ended and is waiting for final completion",
      done: hasCheckedOut || isAfterTrip,
      active: isCheckedOut,
    },
    {
      icon: CheckCircle2,
      label: "Completed",
      description: "The stay has been finalized",
      done: hasCompleted,
      active: false,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h3 className="font-display mb-6 font-semibold text-slate-900">
        Trip timeline
      </h3>
      <div>
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.label} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                    step.done
                      ? "bg-emerald-100 text-emerald-600"
                      : step.active
                        ? "bg-rose-100 text-rose-600 ring-2 ring-rose-200"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {!isLast ? (
                  <div
                    className={`mt-1 h-8 w-0.5 ${
                      step.done ? "bg-emerald-200" : "bg-slate-100"
                    }`}
                  />
                ) : null}
              </div>
              <div className={isLast ? "pb-0" : "pb-6"}>
                <p
                  className={`text-sm font-medium ${
                    step.done || step.active
                      ? "text-slate-900"
                      : "text-slate-400"
                  }`}
                >
                  {step.label}
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    step.active ? "font-medium text-rose-500" : "text-slate-400"
                  }`}
                >
                  {step.active ? "Current stage" : step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
