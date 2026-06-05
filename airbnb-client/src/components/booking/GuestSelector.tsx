"use client";

import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

interface GuestSelectorProps {
  value: GuestCounts;
  onChange: (value: GuestCounts) => void;
  maxGuests?: number;
  petsAllowed?: boolean;
  variant?: "popover" | "inline";
}

function GuestRow({
  label,
  sublabel,
  sublabelLink,
  value,
  min = 0,
  max = 99,
  disabled = false,
  onDecrease,
  onIncrease,
}: {
  label: string;
  sublabel: string;
  sublabelLink?: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && value < max;

  return (
    <div className="flex items-center justify-between py-5 border-b border-gray-100 last:border-0">
      <div className="flex flex-col gap-1">
        <span className="text-[17px] font-semibold text-gray-900 leading-tight">
          {label}
        </span>
        {sublabelLink ? (
          <a
            href={sublabelLink}
            className="text-[15px] text-gray-700 underline underline-offset-2 hover:text-gray-900 transition-colors"
          >
            {sublabel}
          </a>
        ) : (
          <span className="text-[15px] text-gray-500">{sublabel}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={!canDecrease}
          onClick={onDecrease}
          className={cn(
            "w-10 h-10 rounded-full border flex items-center justify-center transition-all",
            canDecrease
              ? "border-gray-400 text-gray-700 hover:border-gray-900 active:scale-95"
              : "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed",
          )}
        >
          <Minus className="w-4 h-4" />
        </button>

        <span
          className={cn(
            "w-5 text-center text-lg tabular-nums select-none",
            disabled ? "text-gray-300" : "text-gray-900",
          )}
        >
          {value}
        </span>

        <button
          type="button"
          disabled={!canIncrease}
          onClick={onIncrease}
          className={cn(
            "w-10 h-10 rounded-full border flex items-center justify-center transition-all",
            canIncrease
              ? "border-gray-400 text-gray-700 hover:border-gray-900 active:scale-95"
              : "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed",
          )}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function GuestSelector({
  value,
  onChange,
  maxGuests = 4,
  petsAllowed = false,
  variant = "popover",
}: GuestSelectorProps) {
  const [open, setOpen] = useState(false);

  const change = (key: keyof GuestCounts, delta: number) => {
    const next = { ...value, [key]: value[key] + delta };
    if (
      (key === "adults" || key === "children") &&
      next.adults + next.children > maxGuests
    )
      return;
    if (key === "adults" && next.adults < 1) return;
    if (next[key] < 0) return;
    onChange(next);
  };

  const guestLabel = (() => {
    const parts: string[] = [];
    if (value.adults > 0) {
      parts.push(`${value.adults} adult${value.adults > 1 ? "s" : ""}`);
    }
    if (value.children > 0) {
      parts.push(`${value.children} child${value.children > 1 ? "ren" : ""}`);
    }
    if (value.infants > 0) {
      parts.push(`${value.infants} infant${value.infants > 1 ? "s" : ""}`);
    }
    if (value.pets > 0) {
      parts.push(`${value.pets} pet${value.pets > 1 ? "s" : ""}`);
    }
    return parts.join(", ") || "1 guest";
  })();

  const guestRows = (
    <>
      <GuestRow
        label="Adults"
        sublabel="Ages 13 or above"
        value={value.adults}
        min={1}
        max={maxGuests - value.children}
        onDecrease={() => change("adults", -1)}
        onIncrease={() => change("adults", 1)}
      />
      <GuestRow
        label="Children"
        sublabel="Ages 2 - 12"
        value={value.children}
        min={0}
        max={maxGuests - value.adults}
        onDecrease={() => change("children", -1)}
        onIncrease={() => change("children", 1)}
      />
      <GuestRow
        label="Infants"
        sublabel="Under 2"
        value={value.infants}
        min={0}
        max={5}
        onDecrease={() => change("infants", -1)}
        onIncrease={() => change("infants", 1)}
      />
      <GuestRow
        label="Pets"
        sublabel="Bringing a service animal?"
        sublabelLink="#"
        value={value.pets}
        min={0}
        max={petsAllowed ? 5 : 0}
        disabled={!petsAllowed}
        onDecrease={() => change("pets", -1)}
        onIncrease={() => change("pets", 1)}
      />
    </>
  );

  if (variant === "inline") {
    return <div>{guestRows}</div>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full border rounded-b-xl px-4 py-3 text-left transition-all focus:outline-none",
            open
              ? "border-gray-900 ring-1 ring-gray-900"
              : "border-gray-300 hover:border-gray-500",
          )}
        >
          <p className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase mb-0.5">
            Guests
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[15px] text-gray-900 truncate pr-2">
              {guestLabel}
            </span>
            {open ? (
              <ChevronUp className="w-4 h-4 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 shrink-0" />
            )}
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl shadow-xl border border-gray-200"
        align="start"
        sideOffset={4}
      >
        <div className="px-5 pt-2 pb-1">{guestRows}</div>

        <div className="px-5 pb-4">
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            This place allows up to {maxGuests} guests, not counting infants.{" "}
            {!petsAllowed && "Pets are not allowed."}
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[15px] font-semibold text-gray-900 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
