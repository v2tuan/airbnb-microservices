"use client";

import { LocateFixed, MapPin, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import GuestSelector, {
  type GuestCounts,
} from "@/components/booking/GuestSelector";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
}

const destinations = [
  { label: "Da Nang", value: "Da Nang" },
  { label: "Ho Chi Minh", value: "Ho Chi Minh" },
  { label: "Ha Noi", value: "Hanoi" },
  { label: "Nha Trang", value: "Nha Trang" },
  { label: "Da Lat", value: "Dalat" },
  { label: "Phu Quoc", value: "Phu Quoc" },
];

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getMonthCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, month, index + 1);
      return {
        day: index + 1,
        key: toDateKey(date),
      };
    }),
  ];
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatDateRange(checkIn: string, checkOut: string) {
  const start = parseDateKey(checkIn);
  const end = parseDateKey(checkOut);
  const startText = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endText = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${startText} - ${endText}`;
}

function countStayGuests(guests: GuestCounts) {
  return guests.adults + guests.children;
}

function formatGuestLabel(guests: GuestCounts) {
  const parts: string[] = [];
  const stayGuests = countStayGuests(guests);

  if (stayGuests > 0) {
    parts.push(`${stayGuests} guest${stayGuests > 1 ? "s" : ""}`);
  }

  if (guests.infants > 0) {
    parts.push(`${guests.infants} infant${guests.infants > 1 ? "s" : ""}`);
  }

  if (guests.pets > 0) {
    parts.push(`${guests.pets} pet${guests.pets > 1 ? "s" : ""}`);
  }

  return parts.length > 0 ? parts.join(", ") : "Add guests";
}

export default function SearchBar({ className }: SearchBarProps) {
  const [activeTab, setActiveTab] = useState<"where" | "when" | "who" | null>(
    null,
  );
  const [where, setWhere] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState<GuestCounts>({
    adults: 1,
    children: 0,
    infants: 0,
    pets: 0,
  });
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [locationError, setLocationError] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Click outside logic
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setActiveTab(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Các vị trí để cái vệt xám trượt theo
  const getHighlightClass = () => {
    if (!activeTab) return "opacity-0 invisible";
    if (activeTab === "where") return "left-0 w-[33.33%]";
    if (activeTab === "when") return "left-[33.33%] w-[33.33%]";
    if (activeTab === "who") return "left-[66.66%] w-[33.33%]";
  };

  const handleSearch = () => {
    const query = new URLSearchParams();
    const destination = where.trim();

    if (destination) {
      query.set("q", destination);
    }

    const stayGuests = countStayGuests(guests);

    if (stayGuests > 1) {
      query.set("guests", String(stayGuests));
    }

    if (guests.adults > 1) {
      query.set("adults", String(guests.adults));
    }

    if (guests.children > 0) {
      query.set("children", String(guests.children));
    }

    if (guests.infants > 0) {
      query.set("infants", String(guests.infants));
    }

    if (guests.pets > 0) {
      query.set("pets", String(guests.pets));
    }

    if (checkIn && checkOut) {
      query.set("checkIn", checkIn);
      query.set("checkOut", checkOut);
    }

    router.push(`/search${query.toString() ? `?${query.toString()}` : ""}`);
  };

  const selectDate = (dateKey: string) => {
    if (!checkIn || (checkIn && checkOut) || dateKey <= checkIn) {
      setCheckIn(dateKey);
      setCheckOut("");
      return;
    }

    setCheckOut(dateKey);
  };

  const isSelectedDate = (dateKey: string) =>
    dateKey === checkIn || dateKey === checkOut;

  const isDateInRange = (dateKey: string) =>
    Boolean(checkIn && checkOut && dateKey > checkIn && dateKey < checkOut);

  const handleNearbySearch = () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Your browser does not support location access.");
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const query = new URLSearchParams();

        query.set("latitude", String(position.coords.latitude));
        query.set("longitude", String(position.coords.longitude));
        query.set("radius", "25");

        const stayGuests = countStayGuests(guests);

        if (stayGuests > 1) {
          query.set("guests", String(stayGuests));
        }

        if (guests.adults > 1) {
          query.set("adults", String(guests.adults));
        }

        if (guests.children > 0) {
          query.set("children", String(guests.children));
        }

        if (guests.infants > 0) {
          query.set("infants", String(guests.infants));
        }

        if (guests.pets > 0) {
          query.set("pets", String(guests.pets));
        }

        if (checkIn && checkOut) {
          query.set("checkIn", checkIn);
          query.set("checkOut", checkOut);
        }

        setWhere("Nearby");
        setLocationStatus("idle");
        router.push(`/search?${query.toString()}`);
      },
      () => {
        setLocationStatus("error");
        setLocationError("Allow location access to search nearby places.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000,
      },
    );
  };

  return (
    // className prop overrides the default mt-10 (e.g. pass "mt-0" from Header)
    <div className={cn("w-full flex justify-center mt-10", className)}>
      <div ref={searchRef} className="relative w-[850px]">
        {/* THANH SEARCH CHÍNH */}
        <div
          className={cn(
            "relative flex items-center border rounded-full transition-all duration-300 h-[66px]",
            activeTab
              ? "bg-[#ebebeb] border-transparent"
              : "bg-white shadow-md hover:shadow-lg",
          )}
        >
          {/* Vệt xám trượt (Highlight background) */}
          <div
            className={cn(
              "absolute top-0 h-full bg-white shadow-xl rounded-full transition-all duration-300 ease-in-out z-10",
              getHighlightClass(),
            )}
          />

          {/* Tab: WHERE */}
          <div
            onClick={() => setActiveTab("where")}
            className={cn(
              "relative flex-[1.2] px-8 flex flex-col justify-center cursor-pointer z-20 h-full rounded-full transition-colors duration-200",
              !activeTab && "hover:bg-gray-100",
              activeTab === "where" ? "text-black" : "text-gray-500",
            )}
          >
            <p className="text-[10px] font-bold text-black uppercase">Where</p>
            <input
              placeholder="Search destinations"
              value={where}
              onChange={(event) => setWhere(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              className="text-sm bg-transparent outline-none placeholder:text-gray-500 w-full"
            />
          </div>

          {/* Tab: WHEN */}
          <div
            onClick={() => setActiveTab("when")}
            className={cn(
              "relative flex-1 px-8 flex flex-col justify-center cursor-pointer z-20 h-full rounded-full transition-colors duration-200",
              !activeTab && "hover:bg-gray-100",
              activeTab === "when" ? "text-black" : "text-gray-500",
              !activeTab &&
                "before:absolute before:left-0 before:h-8 before:w-[1px] before:bg-gray-200",
            )}
          >
            <p className="text-[10px] font-bold text-black uppercase">When</p>
            <p className="text-sm truncate">
              {checkIn && checkOut
                ? formatDateRange(checkIn, checkOut)
                : "Add dates"}
            </p>
          </div>

          {/* Tab: WHO */}
          <div
            onClick={() => setActiveTab("who")}
            className={cn(
              "relative flex-[1.5] pl-8 pr-2 flex items-center justify-between cursor-pointer z-20 h-full rounded-full transition-colors duration-200",
              !activeTab && "hover:bg-gray-100",
              activeTab === "who" ? "text-black" : "text-gray-500",
              !activeTab &&
                "before:absolute before:left-0 before:h-8 before:w-[1px] before:bg-gray-200",
            )}
          >
            <div className="flex flex-col pl-5">
              <p className="text-[10px] font-bold text-black uppercase">Who</p>
              <p className="text-sm">{formatGuestLabel(guests)}</p>
            </div>

            <Button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleSearch();
              }}
              className={cn(
                "rounded-full bg-[#e51d54] hover:bg-[#E31C5F] transition-all duration-300 flex items-center justify-center",
                activeTab ? "px-5 gap-2 h-12" : "w-12 h-12 p-0",
              )}
            >
              <Search className="h-5 w-5 text-white" strokeWidth={3} />
              {activeTab && (
                <span className="text-white font-bold">Search</span>
              )}
            </Button>
          </div>
        </div>

        {/* PANELS (Dropdowns) — absolute positioned, never clipped */}
        <div className="absolute top-[80px] left-0 right-0 z-30">
          {activeTab === "where" && (
            <div className="absolute left-0 w-[400px] bg-white rounded-3xl shadow-2xl border p-8 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="font-bold mb-4">Search by region</p>
              <button
                type="button"
                onClick={handleNearbySearch}
                disabled={locationStatus === "loading"}
                className="mb-5 flex w-full items-center gap-4 rounded-2xl border border-gray-200 p-4 text-left transition hover:border-gray-900 disabled:cursor-wait disabled:opacity-70"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-900">
                  <LocateFixed className="size-5" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-950">
                    Nearby
                  </span>
                  <span className="block text-xs text-gray-500">
                    Use your current location
                  </span>
                </span>
                {locationStatus === "loading" ? (
                  <span className="text-xs font-semibold text-gray-500">
                    Locating...
                  </span>
                ) : (
                  <MapPin className="size-4 text-gray-500" />
                )}
              </button>
              {locationError ? (
                <p className="-mt-3 mb-4 text-xs font-medium text-rose-600">
                  {locationError}
                </p>
              ) : null}
              <div className="grid grid-cols-3 gap-4">
                {destinations.map((city) => (
                  <button
                    type="button"
                    key={city.value}
                    onClick={() => {
                      setWhere(city.value);
                      setActiveTab("who");
                    }}
                    className="flex flex-col gap-2 text-left"
                  >
                    <div className="aspect-square bg-gray-100 rounded-xl border hover:border-black transition cursor-pointer" />
                    <span className="text-xs text-center">{city.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "when" && (
            <div className="absolute left-1/2 -translate-x-1/2 w-[820px] bg-white rounded-3xl shadow-2xl border p-8 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="mb-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth((value) => addMonths(value, -1))
                  }
                  className="flex size-9 items-center justify-center rounded-full hover:bg-gray-100"
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-950">
                    Select your stay dates
                  </p>
                  <p className="text-xs text-gray-500">
                    Results will only show available places
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth((value) => addMonths(value, 1))
                  }
                  className="flex size-9 items-center justify-center rounded-full hover:bg-gray-100"
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-2 gap-10">
                {[calendarMonth, addMonths(calendarMonth, 1)].map((month) => (
                  <div key={toDateKey(month)}>
                    <h3 className="mb-5 text-center text-base font-semibold text-gray-950">
                      {formatMonthTitle(month)}
                    </h3>
                    <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-gray-500">
                      {weekdays.map((weekday) => (
                        <span key={weekday}>{weekday}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
                      {getMonthCells(month).map((cell, index) => {
                        if (!cell) {
                          return (
                            <span key={`empty-${index}`} className="h-10" />
                          );
                        }

                        const isPast = cell.key < toDateKey(new Date());
                        const selected = isSelectedDate(cell.key);
                        const inRange = isDateInRange(cell.key);

                        return (
                          <button
                            type="button"
                            key={cell.key}
                            disabled={isPast}
                            onClick={() => selectDate(cell.key)}
                            className={cn(
                              "mx-auto flex size-10 items-center justify-center rounded-full font-medium transition",
                              isPast && "cursor-not-allowed text-gray-300",
                              !isPast && "hover:border hover:border-gray-950",
                              inRange && "bg-gray-100",
                              selected &&
                                "bg-gray-950 text-white hover:bg-gray-950",
                            )}
                          >
                            {cell.day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between border-t pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setCheckIn("");
                    setCheckOut("");
                  }}
                  className="text-sm font-semibold underline"
                >
                  Clear dates
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">
                    {checkIn && checkOut
                      ? formatDateRange(checkIn, checkOut)
                      : "Choose check-in and check-out"}
                  </span>
                  <Button
                    type="button"
                    disabled={!checkIn || !checkOut}
                    onClick={() => setActiveTab("who")}
                    className="rounded-full bg-gray-950 px-5 text-white hover:bg-black disabled:opacity-40"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "who" && (
            <div className="absolute right-0 w-[430px] bg-white rounded-3xl shadow-2xl border px-8 py-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <GuestSelector
                value={guests}
                onChange={setGuests}
                maxGuests={16}
                petsAllowed
                variant="inline"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
