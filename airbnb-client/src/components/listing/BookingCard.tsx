"use client";

import React, { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, Star } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
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
    <Card className="sticky top-28 p-6 shadow-xl border-zinc-200 bg-white">
      {/* Header: Price and Rating */}
      <div className="flex justify-between items-end">
        <div>
          <span className="text-2xl font-bold">{formatPrice(pricing.basePrice, pricing.currency)}</span>
          <span className="text-zinc-500 text-sm"> / night</span>
        </div>
        {typeof rating === "number" ? (
          <div className="flex items-center gap-1 text-sm font-semibold">
            <Star className="w-3 h-3 fill-black" />
            <span>{rating.toFixed(1)}</span>
            <span className="text-zinc-400 font-normal underline ml-1">
              {typeof reviewCount === "number" ? `${reviewCount} reviews` : "guest rating"}
            </span>
          </div>
        ) : (
          <div className="text-sm font-medium text-zinc-500">Guest rating unavailable</div>
        )}
      </div>

      {/* Date & Guest Inputs */}
      <div className="border border-zinc-400 rounded-xl overflow-hidden">
        <Popover>
          <PopoverTrigger asChild>
            <div className="grid grid-cols-2 divide-x divide-zinc-400 cursor-pointer">
              <div className="p-3 text-left">
                <label className="block text-[10px] font-extrabold uppercase leading-tight">Check-in</label>
                <div className="text-sm text-zinc-600">
                  {date?.from ? format(date.from, "MM/dd/yyyy") : "Add date"}
                </div>
              </div>
              <div className="p-3 text-left">
                <label className="block text-[10px] font-extrabold uppercase leading-tight">Checkout</label>
                <div className="text-sm text-zinc-600">
                  {date?.to ? format(date.to, "MM/dd/yyyy") : "Add date"}
                </div>
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
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

        {/*<div className="p-3 border-t border-zinc-400">*/}
        {/*  <label className="block text-[10px] font-extrabold uppercase leading-tight">Guests</label>*/}
        {/*  <div className="text-sm text-zinc-600">1 guest</div>*/}
        {/*</div>*/}

        <GuestSelector
            value={guests}
            onChange={setGuests}
            maxGuests={maxGuests}
            petsAllowed={petsAllowed}
        />
      </div>

      {/* Action Button */}
      <Button
          onClick={handleReserve} className="w-full bg-[#FF385C] hover:bg-[#E31C5F] text-white font-bold py-6 text-lg rounded-full transition-all">
        {date?.from && date?.to ? "Reserve" : "Check availability"}
      </Button>

      <p className="text-center text-zinc-500 text-sm">
        You won&apos;t be charged yet
      </p>

    </Card>
  );
}