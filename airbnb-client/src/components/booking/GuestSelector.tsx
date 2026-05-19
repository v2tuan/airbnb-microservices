"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronUp, ChevronDown, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────
// Types — export để dùng ở parent
// ────────────────────────────────────────────────────────────
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
}

// ────────────────────────────────────────────────────────────
// GuestRow
// ────────────────────────────────────────────────────────────
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
        <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
            <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-medium text-gray-900 leading-tight">{label}</span>
                {sublabelLink ? (
                    <a href={sublabelLink} className="text-sm text-gray-700 underline hover:text-gray-900 transition-colors">
                        {sublabel}
                    </a>
                ) : (
                    <span className="text-sm text-gray-500">{sublabel}</span>
                )}
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    disabled={!canDecrease}
                    onClick={onDecrease}
                    className={cn(
                        "w-8 h-8 rounded-full border flex items-center justify-center transition-all",
                        canDecrease
                            ? "border-gray-400 text-gray-700 hover:border-gray-900 active:scale-95"
                            : "border-gray-200 text-gray-200 cursor-not-allowed"
                    )}
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>

                <span className={cn("w-5 text-center text-[15px] tabular-nums select-none", disabled ? "text-gray-300" : "text-gray-900")}>
          {value}
        </span>

                <button
                    type="button"
                    disabled={!canIncrease}
                    onClick={onIncrease}
                    className={cn(
                        "w-8 h-8 rounded-full border flex items-center justify-center transition-all",
                        canIncrease
                            ? "border-gray-400 text-gray-700 hover:border-gray-900 active:scale-95"
                            : "border-gray-200 text-gray-200 cursor-not-allowed"
                    )}
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────
// GuestSelector — fully controlled
// ────────────────────────────────────────────────────────────
export default function GuestSelector({
                                          value,
                                          onChange,
                                          maxGuests = 4,
                                          petsAllowed = false,
                                      }: GuestSelectorProps) {
    const [open, setOpen] = useState(false);

    const change = (key: keyof GuestCounts, delta: number) => {
        const next = { ...value, [key]: value[key] + delta };
        if ((key === "adults" || key === "children") && next.adults + next.children > maxGuests) return;
        if (key === "adults" && next.adults < 1) return;
        if (next[key] < 0) return;
        onChange(next);
    };

    const guestLabel = (() => {
        const parts: string[] = [];
        if (value.adults > 0) parts.push(`${value.adults} người lớn`);
        if (value.children > 0) parts.push(`${value.children} trẻ em`);
        if (value.infants > 0) parts.push(`${value.infants} em bé`);
        if (value.pets > 0) parts.push(`${value.pets} thú cưng`);
        return parts.join(", ") || "1 khách";
    })();

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "w-full border rounded-b-xl px-4 py-3 text-left transition-all focus:outline-none",
                        open ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-300 hover:border-gray-500"
                    )}
                >
                    <p className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase mb-0.5">Khách</p>
                    <div className="flex items-center justify-between">
                        <span className="text-[15px] text-gray-900 truncate pr-2">{guestLabel}</span>
                        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                    </div>
                </button>
            </PopoverTrigger>

            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl shadow-xl border border-gray-200"
                align="start"
                sideOffset={4}
            >
                <div className="px-5 pt-2 pb-1">
                    <GuestRow label="Người lớn" sublabel="Từ 13 tuổi trở lên" value={value.adults} min={1} max={maxGuests - value.children} onDecrease={() => change("adults", -1)} onIncrease={() => change("adults", 1)} />
                    <GuestRow label="Trẻ em" sublabel="Độ tuổi 2 – 12" value={value.children} min={0} max={maxGuests - value.adults} onDecrease={() => change("children", -1)} onIncrease={() => change("children", 1)} />
                    <GuestRow label="Em bé" sublabel="Dưới 2 tuổi" value={value.infants} min={0} max={5} onDecrease={() => change("infants", -1)} onIncrease={() => change("infants", 1)} />
                    <GuestRow label="Thú cưng" sublabel="Bạn sẽ mang theo động vật phục vụ?" sublabelLink="#" value={value.pets} min={0} max={petsAllowed ? 5 : 0} disabled={!petsAllowed} onDecrease={() => change("pets", -1)} onIncrease={() => change("pets", 1)} />
                </div>

                <div className="px-5 pb-4">
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">
                        Chỗ ở này cho phép tối đa {maxGuests} khách, không tính em bé.{" "}
                        {!petsAllowed && "Không được phép mang theo thú cưng."}
                    </p>
                    <div className="flex justify-end">
                        <button type="button" onClick={() => setOpen(false)} className="text-[15px] font-semibold text-gray-900 hover:underline">
                            Đóng
                        </button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}