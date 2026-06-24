"use client";

import React, { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { CalendarDays, Star, Users2, ShieldCheck } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatPrice } from "@/contants";
import GuestSelector, {GuestCounts} from "@/components/booking/GuestSelector";
import {useRouter} from "next/navigation";

interface PricingProps {
  basePrice: number;
  cleaningFee: number;
  serviceFeePercentage: number;
  currency: string;
}

// ────────────────────────────────────────────────────────────
// Props — truyền roomId từ page xuống
// ────────────────────────────────────────────────────────────
interface BookingFormProps {
  roomId: string;
  // pricePerNight: number;    // VND
  // originalPrice?: number;   // giá gốc (nếu có giảm giá)
  maxGuests?: number;
  petsAllowed?: boolean;
  pricing: PricingProps;
  rating?: number;
  reviewCount?: number;
}

export function BookingCard({
    roomId,
    maxGuests,
    petsAllowed,
  pricing,
  rating,
  reviewCount,
}: BookingFormProps) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  const [guests, setGuests] = useState<GuestCounts>({
    adults: 1,
    children: 0,
    infants: 0,
    pets: 0,
  });

  const router = useRouter();

  const nightCount = date?.from && date?.to
    ? differenceInDays(date.to, date.from)
    : 0;

  const subtotal = pricing.basePrice * (nightCount || 1);
  const serviceFee = (subtotal * pricing.serviceFeePercentage) / 100;
  const total = subtotal + pricing.cleaningFee + serviceFee;

  const handleReserve = () => {
    if (!date?.from || !date?.to) return;

    const params = new URLSearchParams({
      checkin: format(date.from, "yyyy-MM-dd"),
      checkout: format(date.to, "yyyy-MM-dd"),
      numberOfAdults: String(guests.adults),
      numberOfChildren: String(guests.children),
      numberOfInfants: String(guests.infants),
      numberOfPets: String(guests.pets),
      guestCurrency: pricing.currency,
    });

    // /checkout/[roomId]?checkin=...
    router.push(`/checkout/${roomId}?${params.toString()}`);
  };

  return (
    <aside className="sticky top-24 rounded-[20px] border border-[#dddddd] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] font-semibold tracking-tight text-[#222222]">
              {formatPrice(pricing.basePrice, pricing.currency)}
            </span>
            <span className="text-sm text-zinc-500">night</span>
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">
            Per stay
          </p>
        </div>

        {typeof rating === "number" && (reviewCount ?? 0) > 0 ? (
          <div className="flex items-center gap-1.5 rounded-full border border-[#dddddd] px-3 py-1.5 text-sm font-medium text-[#222222]">
            <Star className="h-4 w-4 fill-current" />
            <span>{rating.toFixed(1)}</span>
            <span className="text-zinc-400">
              {typeof reviewCount === "number" ? `(${reviewCount})` : ""}
            </span>
          </div>
        ) : (
          <div className="text-sm font-medium text-zinc-500">No reviews yet</div>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-[18px] border border-[#dddddd]">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="grid w-full grid-cols-2 divide-x divide-[#dddddd] text-left">
              <div className="p-3.5">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Check-in</label>
                <div className="mt-1 text-sm text-[#222222]">
                  {date?.from ? format(date.from, "MM/dd/yyyy") : "Add date"}
                </div>
              </div>
              <div className="p-3.5">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Checkout</label>
                <div className="mt-1 text-sm text-[#222222]">
                  {date?.to ? format(date.to, "MM/dd/yyyy") : "Add date"}
                </div>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-[18px] border-[#dddddd] p-0 shadow-[0_24px_60px_rgba(0,0,0,0.18)]" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={new Date()}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        <GuestSelector
            value={guests}
            onChange={setGuests}
            maxGuests={maxGuests}
            petsAllowed={petsAllowed}
        />
      </div>

      <Button
        onClick={handleReserve}
        className="mt-4 h-12 w-full rounded-full bg-[#ff385c] text-base font-semibold text-white hover:bg-[#e61e4d]"
      >
        {date?.from && date?.to ? "Reserve" : "Check availability"}
      </Button>

      <div className="mt-3 space-y-2 rounded-[16px] bg-[#f7f7f7] p-4 text-sm text-zinc-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#ff385c]" />
          <span>You won&apos;t be charged yet</span>
        </div>
        <div className="flex items-center gap-2">
          <Users2 className="h-4 w-4 text-[#ff385c]" />
          <span>Up to {maxGuests ?? "?"} guests</span>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-zinc-600">
        <div className="flex items-center justify-between">
          <span className="underline">Base price</span>
          <span>{formatPrice(pricing.basePrice, pricing.currency)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="underline">Cleaning fee</span>
          <span>{formatPrice(pricing.cleaningFee ?? 0, pricing.currency)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="underline">Service fee</span>
          <span>{pricing.serviceFeePercentage?.toFixed?.(0) ?? 0}%</span>
        </div>
      </div>
    </aside>
  );
}
