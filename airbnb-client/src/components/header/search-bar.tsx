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

type Destination = {
  label: string;
  value: string;
  googleKeyword: string;
  image?: string;
};

const destinations: Destination[] = [
  {
    label: "Đà Nẵng",
    value: "Da Nang",
    googleKeyword: "Thành phố Đà Nẵng, Việt Nam",
    image:
      "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=400&q=80&auto=format&fit=crop",
  },
  {
    label: "Hồ Chí Minh",
    value: "Ho Chi Minh",
    googleKeyword: "Thành phố Hồ Chí Minh, Việt Nam",
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80&auto=format&fit=crop",
  },
  {
    label: "Hà Nội",
    value: "Hanoi",
    googleKeyword: "Thành phố Hà Nội, Việt Nam",
    image:
      "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=400&q=80&auto=format&fit=crop",
  },
  {
    label: "Khánh Hòa",
    value: "Khanh Hoa",
    googleKeyword: "Tỉnh Khánh Hòa, Việt Nam",
    image:
      "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=400&q=80&auto=format&fit=crop",
  },
  {
    label: "Lâm Đồng",
    value: "Lam Dong",
    googleKeyword: "Tỉnh Lâm Đồng, Việt Nam",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80&auto=format&fit=crop",
  },
  {
    label: "An Giang",
    value: "An Giang",
    googleKeyword: "Tỉnh An Giang, Việt Nam",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80&auto=format&fit=crop",
  },
];

const moreDestinations: Destination[] = [
  {
    label: "Huế",
    value: "Hue",
    googleKeyword: "Thành phố Huế, Việt Nam",
  },
  {
    label: "Hải Phòng",
    value: "Hai Phong",
    googleKeyword: "Thành phố Hải Phòng, Việt Nam",
  },
  {
    label: "Cần Thơ",
    value: "Can Tho",
    googleKeyword: "Thành phố Cần Thơ, Việt Nam",
  },
  {
    label: "Lai Châu",
    value: "Lai Chau",
    googleKeyword: "Tỉnh Lai Châu, Việt Nam",
  },
  {
    label: "Điện Biên",
    value: "Dien Bien",
    googleKeyword: "Tỉnh Điện Biên, Việt Nam",
  },
  {
    label: "Sơn La",
    value: "Son La",
    googleKeyword: "Tỉnh Sơn La, Việt Nam",
  },
  {
    label: "Lạng Sơn",
    value: "Lang Son",
    googleKeyword: "Tỉnh Lạng Sơn, Việt Nam",
  },
  {
    label: "Quảng Ninh",
    value: "Quang Ninh",
    googleKeyword: "Tỉnh Quảng Ninh, Việt Nam",
  },
  {
    label: "Thanh Hóa",
    value: "Thanh Hoa",
    googleKeyword: "Tỉnh Thanh Hóa, Việt Nam",
  },
  {
    label: "Nghệ An",
    value: "Nghe An",
    googleKeyword: "Tỉnh Nghệ An, Việt Nam",
  },
  {
    label: "Hà Tĩnh",
    value: "Ha Tinh",
    googleKeyword: "Tỉnh Hà Tĩnh, Việt Nam",
  },
  {
    label: "Cao Bằng",
    value: "Cao Bang",
    googleKeyword: "Tỉnh Cao Bằng, Việt Nam",
  },
  {
    label: "Tuyên Quang",
    value: "Tuyen Quang",
    googleKeyword: "Tỉnh Tuyên Quang, Việt Nam",
  },
  {
    label: "Lào Cai",
    value: "Lao Cai",
    googleKeyword: "Tỉnh Lào Cai, Việt Nam",
  },
  {
    label: "Thái Nguyên",
    value: "Thai Nguyen",
    googleKeyword: "Tỉnh Thái Nguyên, Việt Nam",
  },
  {
    label: "Phú Thọ",
    value: "Phu Tho",
    googleKeyword: "Tỉnh Phú Thọ, Việt Nam",
  },
  {
    label: "Bắc Ninh",
    value: "Bac Ninh",
    googleKeyword: "Tỉnh Bắc Ninh, Việt Nam",
  },
  {
    label: "Hưng Yên",
    value: "Hung Yen",
    googleKeyword: "Tỉnh Hưng Yên, Việt Nam",
  },
  {
    label: "Ninh Bình",
    value: "Ninh Binh",
    googleKeyword: "Tỉnh Ninh Bình, Việt Nam",
  },
  {
    label: "Quảng Trị",
    value: "Quang Tri",
    googleKeyword: "Tỉnh Quảng Trị, Việt Nam",
  },
  {
    label: "Quảng Ngãi",
    value: "Quang Ngai",
    googleKeyword: "Tỉnh Quảng Ngãi, Việt Nam",
  },
  {
    label: "Gia Lai",
    value: "Gia Lai",
    googleKeyword: "Tỉnh Gia Lai, Việt Nam",
  },
  {
    label: "Đắk Lắk",
    value: "Dak Lak",
    googleKeyword: "Tỉnh Đắk Lắk, Việt Nam",
  },
  {
    label: "Đồng Nai",
    value: "Dong Nai",
    googleKeyword: "Tỉnh Đồng Nai, Việt Nam",
  },
  {
    label: "Tây Ninh",
    value: "Tay Ninh",
    googleKeyword: "Tỉnh Tây Ninh, Việt Nam",
  },
  {
    label: "Vĩnh Long",
    value: "Vinh Long",
    googleKeyword: "Tỉnh Vĩnh Long, Việt Nam",
  },
  {
    label: "Đồng Tháp",
    value: "Dong Thap",
    googleKeyword: "Tỉnh Đồng Tháp, Việt Nam",
  },
  {
    label: "Cà Mau",
    value: "Ca Mau",
    googleKeyword: "Tỉnh Cà Mau, Việt Nam",
  },
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
  const [locationKeyword, setLocationKeyword] = useState("");
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
  const [showMoreDestinations, setShowMoreDestinations] = useState(false);
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

    if (locationKeyword) {
      query.set("locationKeyword", locationKeyword);
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
        query.set("locationKeyword", "Vị trí hiện tại, Việt Nam");

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
        setLocationKeyword("Vị trí hiện tại, Việt Nam");
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

  const selectDestination = (city: Destination) => {
    setWhere(city.value);
    setLocationKeyword(city.googleKeyword);
    setActiveTab("who");
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
              onChange={(event) => {
                setWhere(event.target.value);
                setLocationKeyword("");
              }}
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
            <div className="absolute left-0 max-h-[min(78vh,720px)] w-[460px] overflow-y-auto bg-white rounded-3xl shadow-2xl border p-8 animate-in fade-in slide-in-from-top-2 duration-300">
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
                    onClick={() => selectDestination(city)}
                    className="group flex flex-col gap-2 text-left"
                  >
                    <div className="aspect-square overflow-hidden rounded-xl border bg-gray-100 transition group-hover:border-black">
                      <img
                        src={city.image}
                        alt={city.label}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-xs text-center">{city.label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowMoreDestinations((value) => !value)}
                className="mt-6 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-900 hover:bg-gray-50"
              >
                {showMoreDestinations
                  ? "Show fewer destinations"
                  : "Show more destinations in Vietnam"}
              </button>
              {showMoreDestinations ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {moreDestinations.map((city) => (
                    <button
                      type="button"
                      key={city.value}
                      onClick={() => selectDestination(city)}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 text-left text-sm font-medium text-gray-800 transition hover:border-gray-900 hover:bg-gray-50"
                    >
                      <MapPin className="size-4 shrink-0 text-gray-500" />
                      <span>{city.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
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
