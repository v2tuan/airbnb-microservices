"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { getMyBookings } from "@/api/endpoints/booking";
import { EmptyState } from "@/components/trips/EmptyState";
import { TripCardSkeleton } from "@/components/trips/SkeletonLoader";
import { TripsCard } from "@/components/trips/TripsCard";
import type { RootState } from "@/store";
import type { BookingTripsResponse } from "@/types/booking.type";
import { extractApiErrorMessage } from "@/types/api.type";

type TripsTab = "UPCOMING" | "COMPLETED" | "CANCELLED";
type EmptyStateType = "upcoming" | "completed" | "cancelled";

const tabs: { id: TripsTab; label: string }[] = [
  { id: "UPCOMING", label: "Upcoming" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
];

const emptyStateTypeByTab: Record<TripsTab, EmptyStateType> = {
  UPCOMING: "upcoming",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export default function TripsPage() {
  const [activeTab, setActiveTab] = useState<TripsTab>("UPCOMING");

  const [loading, setLoading] = useState(true);

  const [trips, setTrips] = useState<BookingTripsResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    async function fetchBookings() {
      try {
        setLoading(true);
        setErrorMessage(null);

        if (!token) return;

        const response = await getMyBookings(token, activeTab);

        setTrips(response.data);
      } catch (error) {
        console.error("Failed to fetch bookings", error);
        setErrorMessage(extractApiErrorMessage(error, "Could not load your trips. Please try again."));
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [activeTab, token]);

  const counts = useMemo(() => {
    return {
      UPCOMING: activeTab === "UPCOMING" ? trips.length : 0,

      COMPLETED: activeTab === "COMPLETED" ? trips.length : 0,

      CANCELLED: activeTab === "CANCELLED" ? trips.length : 0,
    };
  }, [activeTab, trips]);

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="mb-10 animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl font-display text-slate-900 mb-2">
            Your trips
          </h1>

          <p className="text-slate-500 text-base">
            Manage your reservations and travel plans in one place.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100/80 p-1 rounded-2xl w-fit mb-10 animate-fade-in-up-delay-1">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}

              {counts[tab.id] > 0 && (
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    activeTab === tab.id
                      ? "bg-rose-500 text-white"
                      : "bg-slate-300/60 text-slate-600"
                  }`}
                >
                  {counts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <TripCardSkeleton key={i} />
            ))}
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        ) : trips.length === 0 ? (
          <EmptyState type={emptyStateTypeByTab[activeTab]} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip, i) => (
              <div
                key={trip.bookingId}
                className={`animate-fade-in-up-delay-${
                  Math.min(i + 1, 5) as 1 | 2 | 3 | 4 | 5
                }`}
              >
                <TripsCard trip={trip} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
