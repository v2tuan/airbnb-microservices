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

interface PricingProps {
  basePrice: number;
  cleaningFee: number;
  serviceFeePercentage: number;
  currency: string;
}

export function BookingCard({ pricing }: { pricing: PricingProps }) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  const nightCount = date?.from && date?.to 
    ? differenceInDays(date.to, date.from) 
    : 0;

  const subtotal = pricing.basePrice * (nightCount || 1);
  const serviceFee = (subtotal * pricing.serviceFeePercentage) / 100;
  const total = subtotal + pricing.cleaningFee + serviceFee;

  return (
    <Card className="sticky top-28 p-6 shadow-xl border-zinc-200 bg-white">
      {/* Header: Price and Rating */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <span className="text-2xl font-bold">{formatPrice(pricing.basePrice, pricing.currency)}</span>
          <span className="text-zinc-500 text-sm"> / night</span>
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold">
          <Star className="w-3 h-3 fill-black" />
          <span>5.0</span>
          <span className="text-zinc-400 font-normal underline ml-1">3 reviews</span>
        </div>
      </div>

      {/* Date & Guest Inputs */}
      <div className="border border-zinc-400 rounded-xl mb-4">
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

        <div className="p-3 border-t border-zinc-400">
          <label className="block text-[10px] font-extrabold uppercase leading-tight">Guests</label>
          <div className="text-sm text-zinc-600">1 guest</div>
        </div>
      </div>

      {/* Action Button */}
      <Button className="w-full bg-[#FF385C] hover:bg-[#E31C5F] text-white font-bold py-6 text-lg rounded-xl transition-all">
        {date?.from && date?.to ? "Reserve" : "Check availability"}
      </Button>

      <p className="text-center text-zinc-500 text-sm mt-4">
        You won&apos;t be charged yet
      </p>

      {/* Price Breakdown (Only show if dates are selected) */}
      {nightCount > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex justify-between text-zinc-600">
            <span className="underline font-light">{formatPrice(pricing.basePrice, pricing.currency)} x {nightCount} nights</span>
            <span>{formatPrice(subtotal, pricing.currency)}</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span className="underline font-light">Cleaning fee</span>
            <span>{formatPrice(pricing.cleaningFee, pricing.currency)}</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span className="underline font-light">Airbnb service fee</span>
            <span>{formatPrice(serviceFee, pricing.currency)}</span>
          </div>
          <hr className="border-zinc-200" />
          <div className="flex justify-between font-bold text-lg pt-2">
            <span>Total</span>
            <span>{formatPrice(total, pricing.currency)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}